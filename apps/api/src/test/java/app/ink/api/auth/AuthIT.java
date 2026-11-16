// covers AC4, AC5, AC6, AC7, AC8, AC9, T1
package app.ink.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
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
 * Black-box tests for owner login and per-device session tokens: HTTP plus direct reads/writes of
 * owner_session through JdbcTemplate. The owner is seeded from app.auth.* properties (AC2's
 * startup path); rate limiting and seeding edge cases live in LoginRateLimitIT and OwnerSeederIT.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.auth.owner-email=" + AuthIT.EMAIL,
                "app.auth.owner-password-hash=" + AuthIT.PASSWORD_HASH,
        })
@Testcontainers
@ExtendWith(OutputCaptureExtension.class)
class AuthIT {

    static final String EMAIL = "aya@example.com";
    static final String PASSWORD = "correct-horse-battery";
    // bcrypt (cost 4, test-only) of PASSWORD
    static final String PASSWORD_HASH = "$2a$04$G1uKZY/YyYtm/ssB/.KWiuWBnTRirdXaXCfTo/1dT8IZFfjXbNNw6";

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};
    private static final ParameterizedTypeReference<List<Map<String, Object>>> JSON_ARRAY =
            new ParameterizedTypeReference<>() {};

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    TestRestTemplate rest;

    @Autowired
    JdbcTemplate jdbc;

    // ---- helpers -------------------------------------------------------------------------------

    private ResponseEntity<Map<String, Object>> login(String email, String password, String deviceName) {
        Map<String, Object> body = Map.of(
                "email", email,
                "password", password,
                "deviceName", deviceName,
                "platform", "ios");
        return rest.exchange("/auth/login", HttpMethod.POST, new HttpEntity<>(body, jsonHeaders()), JSON_OBJECT);
    }

    private Session loginOk(String deviceName) {
        ResponseEntity<Map<String, Object>> res = login(EMAIL, PASSWORD, deviceName);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return new Session((String) res.getBody().get("token"), UUID.fromString((String) res.getBody().get("sessionId")));
    }

    private static HttpHeaders jsonHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.set(HttpHeaders.CONTENT_TYPE, "application/json");
        return h;
    }

    private static HttpHeaders auth(String authorization) {
        HttpHeaders h = jsonHeaders();
        if (authorization != null) {
            h.set(HttpHeaders.AUTHORIZATION, authorization);
        }
        return h;
    }

    private ResponseEntity<String> getWith(String path, String authorization) {
        return rest.exchange(path, HttpMethod.GET, new HttpEntity<>(auth(authorization)), String.class);
    }

    private ResponseEntity<List<Map<String, Object>>> listSessions(String token) {
        return rest.exchange("/auth/sessions", HttpMethod.GET, new HttpEntity<>(auth("Bearer " + token)), JSON_ARRAY);
    }

    private static String sha256Hex(String s) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
    }

    private Instant lastUsedAt(UUID sessionId) {
        return jdbc.queryForObject("select last_used_at from owner_session where id = ?", Timestamp.class, sessionId)
                .toInstant();
    }

    private void setLastUsedAt(UUID sessionId, Instant at) {
        jdbc.update("update owner_session set last_used_at = ? where id = ?", Timestamp.from(at), sessionId);
    }

    record Session(String token, UUID id) {}

    // ---- AC4: login issues an opaque token, stored only as a SHA-256 hash ----------------------

    @Test
    void loginReturnsOpaqueBase64UrlTokenAndSessionId() {
        ResponseEntity<Map<String, Object>> res = login(EMAIL, PASSWORD, "iPhone of Aya");

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((String) res.getBody().get("token")).matches("^[A-Za-z0-9_-]{43}$"); // 32 bytes, base64url, no padding
        assertThat(UUID.fromString((String) res.getBody().get("sessionId"))).isNotNull();
    }

    @Test
    void loginEmailIsCaseInsensitive() {
        assertThat(login("Aya@Example.COM", PASSWORD, "iPad").getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void onlyTheSha256HashOfTheTokenIsStored() throws Exception {
        Session s = loginOk("iPhone");

        String storedHash = jdbc.queryForObject("select token_hash from owner_session where id = ?", String.class, s.id());
        assertThat(storedHash).isEqualTo(sha256Hex(s.token()));

        Integer rowsWithRawToken = jdbc.queryForObject(
                "select count(*) from owner_session where token_hash = ? or device_name = ?", Integer.class, s.token(), s.token());
        assertThat(rowsWithRawToken).isZero();
    }

    @Test
    void loginStoresDeviceNameAndPlatform() {
        Session s = loginOk("iPad Pro");

        Map<String, Object> row = jdbc.queryForMap("select device_name, platform, deleted_at from owner_session where id = ?", s.id());
        assertThat(row).containsEntry("device_name", "iPad Pro").containsEntry("platform", "ios");
        assertThat(row.get("deleted_at")).isNull();
    }

    @Test
    void rawTokenNeverAppearsInLogs(CapturedOutput output) {
        Session s = loginOk("iPhone");
        listSessions(s.token());
        rest.exchange("/auth/logout", HttpMethod.POST, new HttpEntity<>(auth("Bearer " + s.token())), Void.class);

        assertThat(output.getAll()).doesNotContain(s.token());
    }

    // ---- AC5: no account enumeration ------------------------------------------------------------

    @Test
    void wrongEmailAndWrongPasswordGetTheSame401() {
        ResponseEntity<Map<String, Object>> wrongPassword = login(EMAIL, "nope-nope-nope", "iPhone");
        ResponseEntity<Map<String, Object>> wrongEmail = login("someone@example.com", PASSWORD, "iPhone");

        assertThat(wrongPassword.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(wrongEmail.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(wrongEmail.getBody()).isEqualTo(wrongPassword.getBody());
        assertThat(wrongPassword.getBody()).containsKey("error");
    }

    // ---- AC6: every other endpoint needs a valid Bearer token -----------------------------------

    @Test
    void healthStaysPublic() {
        assertThat(getWith("/health", null).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void protectedEndpointsRejectMissingMalformedAndUnknownTokensTheSameWay() {
        ResponseEntity<String> missing = getWith("/auth/sessions", null);
        ResponseEntity<String> emptyBearer = getWith("/auth/sessions", "Bearer ");
        ResponseEntity<String> basic = getWith("/auth/sessions", "Basic YXlhOnB3");
        ResponseEntity<String> unknown = getWith("/auth/sessions", "Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

        for (ResponseEntity<String> r : List.of(missing, emptyBearer, basic, unknown)) {
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
            assertThat(r.getBody()).isEqualTo(missing.getBody());
        }
        assertThat(missing.getBody()).contains("\"error\"");
    }

    @Test
    void unknownRoutesAre401NotFoundWithoutAToken() {
        assertThat(getWith("/clients", null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void validTokenReachesProtectedEndpoint() {
        Session s = loginOk("iPhone");
        assertThat(listSessions(s.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void corsPreflightIsAllowedWithoutAToken() {
        HttpHeaders h = new HttpHeaders();
        h.set(HttpHeaders.ORIGIN, "http://localhost:8081");
        h.set(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET");
        h.set(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization");

        ResponseEntity<String> res = rest.exchange("/auth/sessions", HttpMethod.OPTIONS, new HttpEntity<>(h), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getHeaders().getAccessControlAllowOrigin()).isEqualTo("http://localhost:8081");
        assertThat(res.getHeaders().getAccessControlAllowHeaders()).anyMatch(v -> v.equalsIgnoreCase("authorization"));
    }

    // ---- AC7: sliding 90-day expiry, last_used_at written at most hourly -----------------------

    @Test
    void sessionUnused89DaysStillWorksAndIsExtended() {
        Session s = loginOk("iPhone");
        setLastUsedAt(s.id(), Instant.now().minus(89, ChronoUnit.DAYS));

        assertThat(listSessions(s.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(lastUsedAt(s.id())).isAfter(Instant.now().minus(1, ChronoUnit.MINUTES));
    }

    @Test
    void sessionUnusedMoreThan90DaysIsRejected() {
        Session s = loginOk("iPhone");
        setLastUsedAt(s.id(), Instant.now().minus(91, ChronoUnit.DAYS));

        assertThat(listSessions(s.token()).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void lastUsedAtIsNotRewrittenWithinTheHour() {
        Session s = loginOk("iPhone");
        Instant tenMinutesAgo = Instant.now().minus(10, ChronoUnit.MINUTES).truncatedTo(ChronoUnit.MILLIS);
        setLastUsedAt(s.id(), tenMinutesAgo);

        listSessions(s.token());

        assertThat(lastUsedAt(s.id())).isEqualTo(tenMinutesAgo);
    }

    @Test
    void lastUsedAtIsRewrittenAfterAnHour() {
        Session s = loginOk("iPhone");
        setLastUsedAt(s.id(), Instant.now().minus(2, ChronoUnit.HOURS));

        listSessions(s.token());

        assertThat(lastUsedAt(s.id())).isAfter(Instant.now().minus(1, ChronoUnit.MINUTES));
    }

    // ---- AC8: logout revokes the calling session ------------------------------------------------

    @Test
    void logoutRevokesOnlyTheCallingSession() {
        Session phone = loginOk("iPhone");
        Session ipad = loginOk("iPad");

        ResponseEntity<Void> res = rest.exchange("/auth/logout", HttpMethod.POST, new HttpEntity<>(auth("Bearer " + phone.token())), Void.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(listSessions(phone.token()).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(listSessions(ipad.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
        // soft delete: the row stays, marked revoked
        assertThat(jdbc.queryForObject("select deleted_at is not null from owner_session where id = ?", Boolean.class, phone.id())).isTrue();
    }

    @Test
    void logoutWithoutATokenIs401() {
        assertThat(rest.exchange("/auth/logout", HttpMethod.POST, new HttpEntity<>(auth(null)), String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ---- AC9: list and revoke sessions ----------------------------------------------------------

    @Test
    void listShowsActiveSessionsWithCurrentFlag() {
        Session phone = loginOk("iPhone 16");
        Session ipad = loginOk("iPad Air");

        ResponseEntity<List<Map<String, Object>>> res = listSessions(phone.token());

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> mine = res.getBody().stream().filter(m -> phone.id().toString().equals(m.get("id"))).findFirst().orElseThrow();
        Map<String, Object> other = res.getBody().stream().filter(m -> ipad.id().toString().equals(m.get("id"))).findFirst().orElseThrow();
        assertThat(mine).containsEntry("current", true).containsEntry("deviceName", "iPhone 16").containsEntry("platform", "ios")
                .containsKeys("createdAt", "lastUsedAt");
        assertThat(other).containsEntry("current", false).containsEntry("deviceName", "iPad Air");
        assertThat(res.getBody()).allSatisfy(m -> assertThat(m).doesNotContainKeys("token", "tokenHash"));
    }

    @Test
    void listExcludesRevokedSessions() {
        Session phone = loginOk("iPhone");
        Session old = loginOk("Old iPad");
        rest.exchange("/auth/logout", HttpMethod.POST, new HttpEntity<>(auth("Bearer " + old.token())), Void.class);

        assertThat(listSessions(phone.token()).getBody()).noneMatch(m -> old.id().toString().equals(m.get("id")));
    }

    @Test
    void revokingAnotherSessionLogsThatDeviceOut() {
        Session phone = loginOk("iPhone");
        Session lost = loginOk("Lost iPad");

        ResponseEntity<Void> res = rest.exchange("/auth/sessions/" + lost.id(), HttpMethod.DELETE,
                new HttpEntity<>(auth("Bearer " + phone.token())), Void.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(listSessions(lost.token()).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(listSessions(phone.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void revokingAnUnknownSessionIs404() {
        Session phone = loginOk("iPhone");

        ResponseEntity<String> res = rest.exchange("/auth/sessions/" + UUID.randomUUID(), HttpMethod.DELETE,
                new HttpEntity<>(auth("Bearer " + phone.token())), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void revokingWithoutATokenIs401() {
        Session lost = loginOk("Lost iPad");

        ResponseEntity<String> res = rest.exchange("/auth/sessions/" + lost.id(), HttpMethod.DELETE,
                new HttpEntity<>(auth(null)), String.class);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(listSessions(lost.token()).getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
