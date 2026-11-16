package app.ink.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Boots the whole API against a real Postgres 16 (Testcontainers) and checks the health endpoint
 * and the Flyway baseline. Covers AC2, AC3, AC4 (T5, T6, T15).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class HealthIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    TestRestTemplate rest;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    @SuppressWarnings("unchecked")
    void healthIsUpWithDatabaseWithoutAuthentication() {
        ResponseEntity<Map> response = rest.getForEntity("/health", Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> body = response.getBody();
        assertThat(body).containsEntry("status", "UP");
        Map<String, Object> components = (Map<String, Object>) body.get("components");
        assertThat(components).containsKey("db");
        assertThat((Map<String, Object>) components.get("db")).containsEntry("status", "UP");
    }

    @Test
    void healthIsNotServedUnderActuatorPrefix() {
        // Since owner-auth-lock, unknown routes are refused before routing (401 without a token,
        // AC6 there), so this checks that nothing health-like is served, not the exact status.
        ResponseEntity<String> response = rest.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.OK);
        assertThat(String.valueOf(response.getBody())).doesNotContain("\"status\":\"UP\"");
    }

    @Test
    void flywayAppliedTheBaselineMigration() {
        Integer applied = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where version = '1' and success",
                Integer.class);
        assertThat(applied).isEqualTo(1);
    }
}
