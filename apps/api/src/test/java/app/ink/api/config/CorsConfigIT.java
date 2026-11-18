package app.ink.api.config;

import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Production CORS (deploy-pipeline AC4). The deployed API sets APP_CORS_ALLOWED_ORIGINS to the web
 * preview's origin; relaxed binding maps it to {@code app.cors.allowed-origins}, the property set here.
 * It must drive both the MVC routes (CorsConfig, through Spring Security's {@code .cors()}) and the
 * actuator {@code /health}, replace the dev default, and refuse every other origin.
 *
 * <p>MockMvc rather than a real HTTP client: the JDK client refuses to send the Origin and
 * Access-Control-Request-* headers. The full filter chain, security included, still runs.
 */
@SpringBootTest(properties = "app.cors.allowed-origins=" + CorsConfigIT.PREVIEW_ORIGIN)
@AutoConfigureMockMvc
@Testcontainers
class CorsConfigIT {

    static final String PREVIEW_ORIGIN = "https://ink-preview.example.test";
    static final String OTHER_ORIGIN = "https://evil.example.test";
    static final String DEV_ORIGIN = "http://localhost:8081";

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    MockMvc mvc;

    @Test
    void previewOriginPreflightForAnAuthenticatedRouteIsAllowedWithAuthorization() throws Exception {
        mvc.perform(options("/settings")
                        .header("Origin", PREVIEW_ORIGIN)
                        .header("Access-Control-Request-Method", "PUT")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", PREVIEW_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Methods", containsStringIgnoringCase("PUT")))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("authorization")))
                // Bearer header, no cookies: credentials stay off.
                .andExpect(header().doesNotExist("Access-Control-Allow-Credentials"));
    }

    @Test
    void previewOriginCanReadHealth() throws Exception {
        mvc.perform(get("/health").header("Origin", PREVIEW_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", PREVIEW_ORIGIN));
    }

    @Test
    void otherOriginPreflightIsRejected() throws Exception {
        mvc.perform(options("/settings")
                        .header("Origin", OTHER_ORIGIN)
                        .header("Access-Control-Request-Method", "PUT")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void otherOriginIsRejectedOnHealth() throws Exception {
        mvc.perform(get("/health").header("Origin", OTHER_ORIGIN))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void devDefaultOriginIsNotAllowedOnceProductionOriginsAreSet() throws Exception {
        mvc.perform(options("/settings")
                        .header("Origin", DEV_ORIGIN)
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
