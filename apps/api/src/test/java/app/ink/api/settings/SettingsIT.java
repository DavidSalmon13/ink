// covers AC2, AC3, AC6, T2
package app.ink.api.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.InstanceOfAssertFactories.MAP;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * The single Settings row: migration-seeded defaults, then GET/PUT /settings under the versioned-write
 * rules (identical retry is a no-op, stale version is a 409 with the current record). Tests share one
 * database, so the defaults check runs first and every write starts from the current GET.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.auth.owner-email=" + SettingsIT.EMAIL,
                "app.auth.owner-password-hash=" + SettingsIT.PASSWORD_HASH,
        })
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SettingsIT {

    static final String EMAIL = "aya@example.com";
    static final String PASSWORD = "correct-horse-battery";
    // bcrypt (cost 4, test-only) of PASSWORD
    static final String PASSWORD_HASH = "$2a$04$G1uKZY/YyYtm/ssB/.KWiuWBnTRirdXaXCfTo/1dT8IZFfjXbNNw6";

    /** Server-managed fields: never part of the editable payload. */
    private static final Set<String> SERVER_FIELDS = Set.of("id", "createdAt", "updatedAt", "deletedAt");

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    TestRestTemplate rest;

    @Autowired
    JdbcTemplate jdbc;

    private String token;

    // ---- helpers -------------------------------------------------------------------------------

    private String token() {
        if (token == null) {
            Map<String, Object> body = Map.of("email", EMAIL, "password", PASSWORD, "deviceName", "iPad", "platform", "ios");
            ResponseEntity<Map<String, Object>> res =
                    rest.exchange("/auth/login", HttpMethod.POST, new HttpEntity<>(body, headers(null)), JSON_OBJECT);
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
            token = (String) res.getBody().get("token");
        }
        return token;
    }

    private static HttpHeaders headers(String token) {
        HttpHeaders h = new HttpHeaders();
        h.set(HttpHeaders.CONTENT_TYPE, "application/json");
        if (token != null) {
            h.setBearerAuth(token);
        }
        return h;
    }

    private ResponseEntity<Map<String, Object>> get() {
        return rest.exchange("/settings", HttpMethod.GET, new HttpEntity<>(headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Map<String, Object>> put(Map<String, Object> body) {
        return rest.exchange("/settings", HttpMethod.PUT, new HttpEntity<>(body, headers(token())), JSON_OBJECT);
    }

    /** The current settings as a PUT body: editable fields plus the expected version. */
    private Map<String, Object> currentAsPayload() {
        ResponseEntity<Map<String, Object>> res = get();
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> payload = new HashMap<>(res.getBody());
        payload.keySet().removeAll(SERVER_FIELDS);
        return payload;
    }

    private static long version(Map<String, Object> record) {
        return ((Number) record.get("version")).longValue();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> error(ResponseEntity<Map<String, Object>> res) {
        assertThat(res.getBody()).containsKey("error");
        assertThat(res.getBody().get("error")).as("error must be an object").isInstanceOf(Map.class);
        return (Map<String, Object>) res.getBody().get("error");
    }

    // ---- AC6: seeded defaults ------------------------------------------------------------------

    @Test
    @Order(1)
    void getReturnsTheSeededDefaults() {
        ResponseEntity<Map<String, Object>> res = get();

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> s = res.getBody();
        assertThat(s).containsEntry("minimumPriceAgorot", 35000)
                .containsEntry("minimumMinutes", 30)
                .containsEntry("hourlyRateAgorot", 33000)
                .containsEntry("designHourlyRateAgorot", 20000)
                .containsEntry("needleOpeningCostAgorot", 7000)
                .containsEntry("extraNeedleCostAgorot", 5000)
                .containsEntry("autoLockSeconds", 0)
                .containsEntry("timezone", "Asia/Jerusalem")
                .containsKeys("id", "version", "createdAt", "updatedAt");
        assertThat(s.get("estimateTables")).isInstanceOf(Map.class).asInstanceOf(MAP).isNotEmpty();
        assertThat(s.get("calibrationPoints")).isNotNull();
        assertThat(s.get("calibrationPoints").toString()).contains("180", "80", "120", "60");
    }

    @Test
    @Order(2)
    void thereIsExactlyOneSettingsRow() {
        assertThat(jdbc.queryForObject("select count(*) from settings", Integer.class)).isEqualTo(1);
    }

    // ---- AC2 / AC3: versioned writes -----------------------------------------------------------

    @Test
    @Order(3)
    void putWithCurrentVersionSavesAndBumpsVersion() {
        Map<String, Object> payload = currentAsPayload();
        long before = version(payload);
        payload.put("minimumPriceAgorot", 40000);

        ResponseEntity<Map<String, Object>> res = put(payload);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("minimumPriceAgorot", 40000);
        assertThat(version(res.getBody())).isEqualTo(before + 1);
        assertThat(get().getBody()).containsEntry("minimumPriceAgorot", 40000);
    }

    @Test
    @Order(4)
    void identicalRetryIs200NoOp() {
        Map<String, Object> payload = currentAsPayload();
        payload.put("hourlyRateAgorot", 34000);
        ResponseEntity<Map<String, Object>> first = put(payload);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        // The same request again (same expected version): a retry after a lost response.
        ResponseEntity<Map<String, Object>> retry = put(payload);

        assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(version(retry.getBody())).isEqualTo(version(first.getBody()));
        assertThat(retry.getBody()).isEqualTo(first.getBody());
        assertThat(jdbc.queryForObject("select count(*) from settings", Integer.class)).isEqualTo(1);
    }

    @Test
    @Order(5)
    @SuppressWarnings("unchecked")
    void staleVersionIs409VersionConflictWithCurrentRecord() {
        Map<String, Object> stale = currentAsPayload();
        Map<String, Object> fresh = new HashMap<>(stale);
        fresh.put("minimumMinutes", 45);
        ResponseEntity<Map<String, Object>> saved = put(fresh);
        assertThat(saved.getStatusCode()).isEqualTo(HttpStatus.OK);

        // The other device still holds the old version and changes something else.
        stale.put("autoLockSeconds", 60);
        ResponseEntity<Map<String, Object>> res = put(stale);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> error = error(res);
        assertThat(error).containsEntry("code", "version_conflict");
        Map<String, Object> current = (Map<String, Object>) ((Map<String, Object>) error.get("details")).get("current");
        assertThat(current).containsEntry("minimumMinutes", 45).containsEntry("autoLockSeconds", 0);
        assertThat(version(current)).isEqualTo(version(saved.getBody()));
        assertThat(get().getBody()).containsEntry("autoLockSeconds", 0);
    }

    // ---- AC6: money is integer agorot ≥ 0 ------------------------------------------------------

    @Test
    @Order(6)
    @SuppressWarnings("unchecked")
    void negativeAgorotIsValidationFailed() {
        Map<String, Object> payload = currentAsPayload();
        payload.put("extraNeedleCostAgorot", -1);

        ResponseEntity<Map<String, Object>> res = put(payload);

        // AC5 fixes the code, not the status; any 4xx client error is accepted here.
        assertThat(res.getStatusCode().is4xxClientError()).isTrue();
        Map<String, Object> error = error(res);
        assertThat(error).containsEntry("code", "validation_failed");
        Map<String, Object> fields = (Map<String, Object>) ((Map<String, Object>) error.get("details")).get("fields");
        assertThat(fields).containsKey("extraNeedleCostAgorot");
        assertThat(get().getBody()).containsEntry("extraNeedleCostAgorot", 5000);
    }

}
