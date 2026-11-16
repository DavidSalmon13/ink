// covers AC5, T1
package app.ink.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
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
import org.springframework.test.annotation.DirtiesContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Login brute-force protection: 5 failed attempts within 15 minutes, counted per email and per
 * client IP, then 429 even for the correct password. The limiter is in memory, so each test gets
 * a fresh application context (and therefore a fresh limiter).
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.auth.owner-email=" + AuthIT.EMAIL,
                "app.auth.owner-password-hash=" + AuthIT.PASSWORD_HASH,
        })
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class LoginRateLimitIT {

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    TestRestTemplate rest;

    private ResponseEntity<Map<String, Object>> login(String email, String password) {
        HttpHeaders h = new HttpHeaders();
        h.set(HttpHeaders.CONTENT_TYPE, "application/json");
        Map<String, Object> body = Map.of("email", email, "password", password, "deviceName", "iPhone", "platform", "ios");
        return rest.exchange("/auth/login", HttpMethod.POST, new HttpEntity<>(body, h), JSON_OBJECT);
    }

    @Test
    void fourFailuresStillAllowTheCorrectPassword() {
        for (int i = 0; i < 4; i++) {
            assertThat(login(AuthIT.EMAIL, "wrong-" + i).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
        assertThat(login(AuthIT.EMAIL, AuthIT.PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void fiveFailuresForTheEmailBlockEvenTheCorrectPassword() {
        for (int i = 0; i < 5; i++) {
            assertThat(login(AuthIT.EMAIL, "wrong-" + i).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        ResponseEntity<Map<String, Object>> blocked = login(AuthIT.EMAIL, AuthIT.PASSWORD);

        assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(blocked.getBody()).containsKey("error");
    }

    @Test
    void emailMatchingForTheLimitIsCaseInsensitive() {
        for (int i = 0; i < 5; i++) {
            login(i % 2 == 0 ? "AYA@example.com" : AuthIT.EMAIL, "wrong-" + i);
        }
        assertThat(login(AuthIT.EMAIL, AuthIT.PASSWORD).getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void fiveFailuresFromOneIpBlockThatIpAcrossEmails() {
        for (int i = 0; i < 5; i++) {
            assertThat(login("guess" + i + "@example.com", "whatever").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }

        assertThat(login(AuthIT.EMAIL, AuthIT.PASSWORD).getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void successfulLoginDoesNotCountAsAFailure() {
        for (int i = 0; i < 10; i++) {
            assertThat(login(AuthIT.EMAIL, AuthIT.PASSWORD).getStatusCode()).isEqualTo(HttpStatus.OK);
        }
    }
}
