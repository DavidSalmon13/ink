// covers AC2, T1
package app.ink.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import app.ink.api.InkApiApplication;

/**
 * The owner account is seeded from OWNER_EMAIL / OWNER_PASSWORD_HASH (app.auth.*) on startup.
 * Each test restarts the real application against one Postgres container to exercise the
 * upsert and the revoke-all-sessions-on-password-change behaviour. The schema is reset before
 * each test so Flyway starts from scratch.
 */
@Testcontainers
@ExtendWith(OutputCaptureExtension.class)
class OwnerSeederIT {

    private static final String NEW_PASSWORD = "rotated-password-2";
    // bcrypt (cost 4, test-only) of NEW_PASSWORD
    private static final String NEW_PASSWORD_HASH = "$2a$04$Ta6YGLX4b8wGLqfwcPEsT.dRO84PfxRfm7tH7mI4mXeteZthJvRV.";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @BeforeEach
    void resetSchema() throws Exception {
        try (Connection c = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             Statement s = c.createStatement()) {
            s.execute("drop schema public cascade; create schema public;");
        }
    }

    // ---- helpers -------------------------------------------------------------------------------

    private ConfigurableApplicationContext start(String ownerEmail, String ownerPasswordHash) {
        Map<String, Object> props = new HashMap<>();
        props.put("server.port", "0");
        props.put("spring.datasource.url", postgres.getJdbcUrl());
        props.put("spring.datasource.username", postgres.getUsername());
        props.put("spring.datasource.password", postgres.getPassword());
        props.put("app.auth.owner-email", ownerEmail == null ? "" : ownerEmail);
        props.put("app.auth.owner-password-hash", ownerPasswordHash == null ? "" : ownerPasswordHash);
        // Command-line args, not builder.properties(): those are defaults and lose to application.yml.
        String[] args = props.entrySet().stream().map(e -> "--" + e.getKey() + "=" + e.getValue()).toArray(String[]::new);
        return new SpringApplicationBuilder(InkApiApplication.class).run(args);
    }

    private static RestClient client(ConfigurableApplicationContext ctx) {
        String port = ctx.getEnvironment().getProperty("local.server.port");
        return RestClient.builder().baseUrl("http://localhost:" + port).build();
    }

    private static HttpStatusCode loginStatus(ConfigurableApplicationContext ctx, String email, String password) {
        return client(ctx).post().uri("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("email", email, "password", password, "deviceName", "iPhone", "platform", "ios"))
                .exchange((req, res) -> res.getStatusCode());
    }

    @SuppressWarnings("unchecked")
    private static String loginToken(ConfigurableApplicationContext ctx, String email, String password) {
        Map<String, Object> body = client(ctx).post().uri("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("email", email, "password", password, "deviceName", "iPhone", "platform", "ios"))
                .retrieve().body(Map.class);
        return (String) body.get("token");
    }

    private static HttpStatusCode sessionsStatus(ConfigurableApplicationContext ctx, String token) {
        return client(ctx).get().uri("/auth/sessions").header("Authorization", "Bearer " + token)
                .exchange((req, res) -> res.getStatusCode());
    }

    // ---- AC2 -----------------------------------------------------------------------------------

    @Test
    void createsTheOwnerOnFirstStartup() {
        try (ConfigurableApplicationContext ctx = start("Aya@Example.com", AuthIT.PASSWORD_HASH)) {
            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("select count(*) from owner where deleted_at is null", Integer.class)).isEqualTo(1);
            assertThat(loginStatus(ctx, AuthIT.EMAIL, AuthIT.PASSWORD).value()).isEqualTo(200);
        }
    }

    @Test
    void restartWithTheSameHashKeepsSessionsAndDoesNotDuplicateTheOwner() {
        String token;
        try (ConfigurableApplicationContext ctx = start(AuthIT.EMAIL, AuthIT.PASSWORD_HASH)) {
            token = loginToken(ctx, AuthIT.EMAIL, AuthIT.PASSWORD);
        }
        try (ConfigurableApplicationContext ctx = start(AuthIT.EMAIL, AuthIT.PASSWORD_HASH)) {
            assertThat(sessionsStatus(ctx, token).value()).isEqualTo(200);
            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("select count(*) from owner", Integer.class)).isEqualTo(1);
        }
    }

    @Test
    void changedHashUpdatesThePasswordAndRevokesEverySession() {
        String phoneToken;
        String ipadToken;
        try (ConfigurableApplicationContext ctx = start(AuthIT.EMAIL, AuthIT.PASSWORD_HASH)) {
            phoneToken = loginToken(ctx, AuthIT.EMAIL, AuthIT.PASSWORD);
            ipadToken = loginToken(ctx, AuthIT.EMAIL, AuthIT.PASSWORD);
        }
        try (ConfigurableApplicationContext ctx = start(AuthIT.EMAIL, NEW_PASSWORD_HASH)) {
            assertThat(sessionsStatus(ctx, phoneToken).value()).isEqualTo(401);
            assertThat(sessionsStatus(ctx, ipadToken).value()).isEqualTo(401);
            assertThat(loginStatus(ctx, AuthIT.EMAIL, AuthIT.PASSWORD).value()).isEqualTo(401);
            assertThat(loginStatus(ctx, AuthIT.EMAIL, NEW_PASSWORD).value()).isEqualTo(200);

            JdbcTemplate jdbc = ctx.getBean(JdbcTemplate.class);
            // soft delete: revoked rows are kept, not removed
            assertThat(jdbc.queryForObject("select count(*) from owner_session where deleted_at is not null", Integer.class))
                    .isEqualTo(2);
        }
    }

    @Test
    void tokensOfASoftDeletedOwnerStopWorking() {
        try (ConfigurableApplicationContext ctx = start(AuthIT.EMAIL, AuthIT.PASSWORD_HASH)) {
            String token = loginToken(ctx, AuthIT.EMAIL, AuthIT.PASSWORD);
            ctx.getBean(JdbcTemplate.class).update("update owner set deleted_at = now()");

            assertThat(sessionsStatus(ctx, token).value()).isEqualTo(401);
        }
    }

    @Test
    void withoutOwnerConfigTheApiStartsWarnsAndEveryLoginFails(CapturedOutput output) {
        try (ConfigurableApplicationContext ctx = start(null, null)) {
            assertThat(output.getAll().lines()).anyMatch(l -> l.contains("WARN") && l.contains("OWNER_EMAIL"));
            assertThat(loginStatus(ctx, AuthIT.EMAIL, AuthIT.PASSWORD).value()).isEqualTo(401);
            assertThat(client(ctx).get().uri("/health").exchange((req, res) -> res.getStatusCode()).value()).isEqualTo(200);
        }
    }
}
