// covers AC5, AC9, T1
package app.ink.api.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * The shared error body {@code {"error": {"code", "message", "details"?}}} for every failure path:
 * routing, unreadable JSON, Bean Validation, missing auth and unhandled exceptions. Uses a test-only
 * controller ({@link ErrorProbeController}) so it doesn't depend on any feature module.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.auth.owner-email=" + ErrorFormatIT.EMAIL,
                "app.auth.owner-password-hash=" + ErrorFormatIT.PASSWORD_HASH,
        })
@Testcontainers
@Import(ErrorFormatIT.ErrorProbeController.class)
class ErrorFormatIT {

    static final String EMAIL = "aya@example.com";
    static final String PASSWORD = "correct-horse-battery";
    // bcrypt (cost 4, test-only) of PASSWORD
    static final String PASSWORD_HASH = "$2a$04$G1uKZY/YyYtm/ssB/.KWiuWBnTRirdXaXCfTo/1dT8IZFfjXbNNw6";

    static final String SECRET = "s3cret-internal-value";

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    TestRestTemplate rest;

    /** Test-only endpoints that trigger each error path. */
    @RestController
    static class ErrorProbeController {

        record Probe(@NotBlank String name, @Min(0) long amountAgorot) {}

        @PostMapping("/__probe/validate")
        Probe validate(@Valid @RequestBody Probe probe) {
            return probe;
        }

        @GetMapping("/__probe/boom")
        String boom(@RequestParam String value) {
            throw new IllegalStateException("db password is " + SECRET + " for " + value);
        }
    }

    // ---- helpers -------------------------------------------------------------------------------

    private String token() {
        Map<String, Object> body = Map.of("email", EMAIL, "password", PASSWORD, "deviceName", "iPhone", "platform", "ios");
        ResponseEntity<Map<String, Object>> res =
                rest.exchange("/auth/login", HttpMethod.POST, new HttpEntity<>(body, headers(null)), JSON_OBJECT);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (String) res.getBody().get("token");
    }

    private static HttpHeaders headers(String token) {
        HttpHeaders h = new HttpHeaders();
        h.set(HttpHeaders.CONTENT_TYPE, "application/json");
        if (token != null) {
            h.setBearerAuth(token);
        }
        return h;
    }

    private ResponseEntity<Map<String, Object>> call(HttpMethod method, String path, Object body, String token) {
        return rest.exchange(path, method, new HttpEntity<>(body, headers(token)), JSON_OBJECT);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> error(ResponseEntity<Map<String, Object>> res) {
        assertThat(res.getBody()).containsKey("error");
        assertThat(res.getBody().get("error")).as("error must be an object").isInstanceOf(Map.class);
        Map<String, Object> error = (Map<String, Object>) res.getBody().get("error");
        assertThat(error).containsKeys("code", "message");
        assertThat(error.keySet()).isSubsetOf("code", "message", "details");
        return error;
    }

    // ---- AC5: one error format -----------------------------------------------------------------

    @Test
    void unknownRouteWithTokenIs404NotFound() {
        ResponseEntity<Map<String, Object>> res = call(HttpMethod.GET, "/no-such-route", null, token());

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(res)).containsEntry("code", "not_found");
    }

    @Test
    void malformedJsonIs400BadRequest() {
        ResponseEntity<Map<String, Object>> res = call(HttpMethod.POST, "/__probe/validate", "{\"name\": ", token());

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error(res)).containsEntry("code", "bad_request");
    }

    @Test
    @SuppressWarnings("unchecked")
    void invalidBodyIsValidationFailedWithPerFieldDetails() {
        ResponseEntity<Map<String, Object>> res =
                call(HttpMethod.POST, "/__probe/validate", Map.of("name", "", "amountAgorot", -1), token());

        // AC5 fixes the code, not the status; any 4xx client error is accepted here.
        assertThat(res.getStatusCode().is4xxClientError()).isTrue();
        Map<String, Object> error = error(res);
        assertThat(error).containsEntry("code", "validation_failed");
        Map<String, Object> details = (Map<String, Object>) error.get("details");
        assertThat(details).containsKey("fields");
        assertThat((Map<String, Object>) details.get("fields")).containsOnlyKeys("name", "amountAgorot");
    }

    @Test
    void unhandledExceptionIs500InternalErrorWithoutInternals() {
        String requestValue = "req-" + UUID.randomUUID();
        ResponseEntity<String> res = rest.exchange("/__probe/boom?value=" + requestValue, HttpMethod.GET,
                new HttpEntity<>(headers(token())), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(res.getBody())
                .contains("\"code\":\"internal_error\"")
                .doesNotContain(SECRET)
                .doesNotContain(requestValue)
                .doesNotContain("IllegalStateException")
                .doesNotContain("at app.ink");
    }

    // ---- AC9: every new endpoint needs a Bearer session ----------------------------------------

    @Test
    void newEndpointsWithoutTokenAre401Unauthorized() {
        UUID id = UUID.randomUUID();
        List<ResponseEntity<Map<String, Object>>> responses = List.of(
                call(HttpMethod.GET, "/settings", null, null),
                call(HttpMethod.PUT, "/settings", Map.of("version", 0), null),
                call(HttpMethod.PUT, "/attachments/" + id,
                        Map.of("kind", "sketch", "mimeType", "image/png", "sizeBytes", 10), null),
                call(HttpMethod.GET, "/attachments/" + id + "/download-url", null, null),
                call(HttpMethod.DELETE, "/attachments/" + id, null, null));

        for (ResponseEntity<Map<String, Object>> res : responses) {
            assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(error(res)).containsEntry("code", "unauthorized");
        }
    }

}
