// covers AC2, AC4, AC7, AC8, AC9, T3
package app.ink.api.attachment;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.adobe.testing.s3mock.testcontainers.S3MockContainer;

/**
 * Attachments end to end against Postgres and a real S3-compatible store (S3Mock): PUT creates the record
 * and hands back a presigned upload URL, the bytes uploaded there come back through the download URL,
 * retries never duplicate, bad type/size are refused, and DELETE is a repeatable soft delete.
 * Every test uses its own attachment id, so order doesn't matter.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.auth.owner-email=" + AttachmentIT.EMAIL,
                "app.auth.owner-password-hash=" + AttachmentIT.PASSWORD_HASH,
        })
@Testcontainers
class AttachmentIT {

    static final String EMAIL = "aya@example.com";
    static final String PASSWORD = "correct-horse-battery";
    // bcrypt (cost 4, test-only) of PASSWORD
    static final String PASSWORD_HASH = "$2a$04$G1uKZY/YyYtm/ssB/.KWiuWBnTRirdXaXCfTo/1dT8IZFfjXbNNw6";

    static final String BUCKET = "ink-attachments";
    /** AC7's 15-minute validity, as it appears in a SigV4 presigned URL. */
    static final String FIFTEEN_MINUTES = "X-Amz-Expires=900";

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static S3MockContainer s3 = new S3MockContainer("4.12.4").withInitialBuckets(BUCKET);

    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("app.storage.endpoint", s3::getHttpEndpoint);
        registry.add("app.storage.region", () -> "us-east-1");
        registry.add("app.storage.bucket", () -> BUCKET);
        registry.add("app.storage.access-key", () -> "test-access-key");
        registry.add("app.storage.secret-key", () -> "test-secret-key");
    }

    @Autowired
    TestRestTemplate rest;

    @Autowired
    JdbcTemplate jdbc;

    private final HttpClient http = HttpClient.newHttpClient();

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

    private static Map<String, Object> png(int sizeBytes) {
        Map<String, Object> body = new HashMap<>();
        body.put("kind", "sketch");
        body.put("mimeType", "image/png");
        body.put("sizeBytes", sizeBytes);
        body.put("width", 800);
        body.put("height", 600);
        return body;
    }

    private ResponseEntity<Map<String, Object>> put(UUID id, Map<String, Object> body) {
        return rest.exchange("/attachments/" + id, HttpMethod.PUT, new HttpEntity<>(body, headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Map<String, Object>> downloadUrl(UUID id) {
        return rest.exchange("/attachments/" + id + "/download-url", HttpMethod.GET,
                new HttpEntity<>(headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Map<String, Object>> delete(UUID id) {
        return rest.exchange("/attachments/" + id, HttpMethod.DELETE, new HttpEntity<>(headers(token())), JSON_OBJECT);
    }

    private int rows(UUID id) {
        return jdbc.queryForObject("select count(*) from attachment where id = ?", Integer.class, id);
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

    // ---- AC7: create + presigned upload/download -----------------------------------------------

    @Test
    void putCreatesTheRecordAndReturnsA15MinuteUploadUrl() {
        UUID id = UUID.randomUUID();

        ResponseEntity<Map<String, Object>> res = put(id, png(1234));

        assertThat(res.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(res.getBody())
                .containsEntry("id", id.toString())
                .containsEntry("kind", "sketch")
                .containsEntry("mimeType", "image/png")
                .containsEntry("sizeBytes", 1234)
                .containsEntry("width", 800)
                .containsEntry("height", 600)
                .containsKeys("version", "createdAt", "updatedAt");
        assertThat((String) res.getBody().get("uploadUrl")).startsWith(s3.getHttpEndpoint()).contains(FIFTEEN_MINUTES);
        assertThat(rows(id)).isEqualTo(1);
    }

    @Test
    void bytesPutToTheUploadUrlComeBackThroughTheDownloadUrl() throws Exception {
        UUID id = UUID.randomUUID();
        byte[] bytes = "not really a png, but bytes are bytes".getBytes();
        ResponseEntity<Map<String, Object>> created = put(id, png(bytes.length));
        assertThat(created.getStatusCode().is2xxSuccessful()).isTrue();

        // The presigned URL is the credential: no Authorization header (AC7, Technical Approach → Mobile).
        HttpResponse<Void> upload = http.send(
                HttpRequest.newBuilder(URI.create((String) created.getBody().get("uploadUrl")))
                        .header("Content-Type", "image/png")
                        .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                        .build(),
                HttpResponse.BodyHandlers.discarding());
        assertThat(upload.statusCode()).isEqualTo(200);

        ResponseEntity<Map<String, Object>> res = downloadUrl(id);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        String url = (String) res.getBody().get("downloadUrl");
        assertThat(url).startsWith(s3.getHttpEndpoint()).contains(FIFTEEN_MINUTES);
        HttpResponse<byte[]> download = http.send(
                HttpRequest.newBuilder(URI.create(url)).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
        assertThat(download.statusCode()).isEqualTo(200);
        assertThat(download.body()).isEqualTo(bytes);
    }

    // ---- AC2: retries never duplicate ----------------------------------------------------------

    @Test
    void identicalRetryIs200WithTheSameRecordAndNoDuplicate() {
        UUID id = UUID.randomUUID();
        ResponseEntity<Map<String, Object>> first = put(id, png(2048));
        assertThat(first.getStatusCode().is2xxSuccessful()).isTrue();

        ResponseEntity<Map<String, Object>> retry = put(id, png(2048));

        assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(retry.getBody().get("id")).isEqualTo(id.toString());
        assertThat(version(retry.getBody())).isEqualTo(version(first.getBody()));
        assertThat(rows(id)).isEqualTo(1);
    }

    // ---- AC7 + AC5: type and size limits -------------------------------------------------------

    @Test
    void unsupportedMimeTypeIsRejected() {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = png(1000);
        body.put("mimeType", "application/pdf");

        ResponseEntity<Map<String, Object>> res = put(id, body);

        assertThat(res.getStatusCode().is4xxClientError()).isTrue();
        assertThat(error(res)).containsEntry("code", "unsupported_media_type");
        assertThat(rows(id)).isZero();
    }

    @Test
    void over15MbIsRejected() {
        UUID id = UUID.randomUUID();

        // One byte over 15 MiB: over the limit whether "MB" means 10^6 or 2^20.
        ResponseEntity<Map<String, Object>> res = put(id, png(15 * 1024 * 1024 + 1));

        assertThat(res.getStatusCode().is4xxClientError()).isTrue();
        assertThat(error(res)).containsEntry("code", "payload_too_large");
        assertThat(rows(id)).isZero();
    }

    @Test
    void unknownKindIsValidationFailed() {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = png(1000);
        body.put("kind", "invoice");

        ResponseEntity<Map<String, Object>> res = put(id, body);

        assertThat(res.getStatusCode().is4xxClientError()).isTrue();
        assertThat(error(res)).containsEntry("code", "validation_failed");
        assertThat(rows(id)).isZero();
    }

    // ---- AC4: soft delete ----------------------------------------------------------------------

    @Test
    void deleteSoftDeletesRepeatsAs204AndHidesTheRecord() {
        UUID id = UUID.randomUUID();
        assertThat(put(id, png(500)).getStatusCode().is2xxSuccessful()).isTrue();

        assertThat(delete(id).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete(id).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // Soft: the row stays, marked deleted.
        assertThat(rows(id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select deleted_at is not null from attachment where id = ?", Boolean.class, id))
                .isTrue();

        ResponseEntity<Map<String, Object>> res = downloadUrl(id);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(res)).containsEntry("code", "not_found");
    }

    @Test
    void unknownIdIs404NotFound() {
        ResponseEntity<Map<String, Object>> res = downloadUrl(UUID.randomUUID());

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(res)).containsEntry("code", "not_found");
    }

    // ---- AC9: auth -----------------------------------------------------------------------------

    @Test
    void withoutATokenIs401Unauthorized() {
        ResponseEntity<Map<String, Object>> res = rest.exchange("/attachments/" + UUID.randomUUID(), HttpMethod.PUT,
                new HttpEntity<>(png(100), headers(null)), JSON_OBJECT);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(error(res)).containsEntry("code", "unauthorized");
    }
}
