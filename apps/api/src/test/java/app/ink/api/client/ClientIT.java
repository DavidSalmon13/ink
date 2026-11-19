// covers AC1, AC2, AC3, AC4, AC5, AC9, T2
package app.ink.api.client;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
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
import org.springframework.web.util.UriComponentsBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Clients: create-or-update with a device UUID under the versioned-write rules, get by id, and the
 * list with server-side search. Tests share one database, so every test creates its own clients with
 * fresh UUIDs and asserts on those ids only.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.auth.owner-email=" + ClientIT.EMAIL,
                "app.auth.owner-password-hash=" + ClientIT.PASSWORD_HASH,
        })
@Testcontainers
class ClientIT {

    static final String EMAIL = "aya@example.com";
    static final String PASSWORD = "correct-horse-battery";
    // bcrypt (cost 4, test-only) of PASSWORD
    static final String PASSWORD_HASH = "$2a$04$G1uKZY/YyYtm/ssB/.KWiuWBnTRirdXaXCfTo/1dT8IZFfjXbNNw6";

    private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT =
            new ParameterizedTypeReference<>() {};

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    TestRestTemplate rest;

    @Autowired
    JdbcTemplate jdbc;

    private static String token;

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

    private ResponseEntity<Map<String, Object>> put(UUID id, Map<String, Object> body) {
        return rest.exchange("/clients/" + id, HttpMethod.PUT, new HttpEntity<>(body, headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Map<String, Object>> get(UUID id) {
        return rest.exchange("/clients/" + id, HttpMethod.GET, new HttpEntity<>(headers(token())), JSON_OBJECT);
    }

    /**
     * GET /clients[?q=]: read as Object so a non-array error body fails an assertion, not deserialization.
     * Passes the encoded URI itself: a String would be encoded a second time (%D7 → %25D7).
     */
    private ResponseEntity<Object> list(String q) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromPath("/clients");
        if (q != null) {
            uri.queryParam("q", q);
        }
        return rest.exchange(uri.encode().build().toUri(), HttpMethod.GET,
                new HttpEntity<>(headers(token())), Object.class);
    }

    /** The ids returned by GET /clients[?q=], in response order. */
    @SuppressWarnings("unchecked")
    private List<String> listIds(String q) {
        ResponseEntity<Object> res = list(q);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).as("GET /clients returns a JSON array").isInstanceOf(List.class);
        return ((List<Map<String, Object>>) res.getBody()).stream().map(c -> (String) c.get("id")).toList();
    }

    /** Creates a client (no version) and returns its id. */
    private UUID create(Map<String, Object> body) {
        UUID id = UUID.randomUUID();
        ResponseEntity<Map<String, Object>> res = put(id, body);
        assertThat(res.getStatusCode()).as("create %s", body).isEqualTo(HttpStatus.OK);
        return id;
    }

    private static Map<String, Object> client(String name) {
        Map<String, Object> m = new HashMap<>();
        m.put("name", name);
        return m;
    }

    private static long version(Map<String, Object> record) {
        return ((Number) record.get("version")).longValue();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> error(ResponseEntity<Map<String, Object>> res) {
        assertThat(res.getBody()).containsKey("error");
        return (Map<String, Object>) res.getBody().get("error");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> fields(ResponseEntity<Map<String, Object>> res) {
        Map<String, Object> error = error(res);
        assertThat(error).containsEntry("code", "validation_failed");
        return (Map<String, Object>) ((Map<String, Object>) error.get("details")).get("fields");
    }

    // ---- AC1: create ---------------------------------------------------------------------------

    @Test
    void createWithOnlyANameReturnsTheClientAtVersion0() {
        UUID id = UUID.randomUUID();

        ResponseEntity<Map<String, Object>> res = put(id, client("  נועה ברק  "));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> c = res.getBody();
        assertThat(c).containsEntry("id", id.toString())
                .containsEntry("name", "נועה ברק")
                .containsEntry("tattooCount", 0)
                .containsKeys("phone", "email", "instagram", "notes", "createdAt", "updatedAt");
        assertThat(version(c)).isZero();
        assertThat(c.get("phone")).isNull();
    }

    @Test
    void createWithAllFieldsKeepsThem() {
        Map<String, Object> body = client("מאיה לוי");
        body.put("phone", "054-381-2290");
        body.put("email", "maya@example.com");
        body.put("instagram", "@maya.lines");
        body.put("notes", "מעדיפה קו דק");

        UUID id = create(body);

        assertThat(get(id).getBody()).containsEntry("phone", "054-381-2290")
                .containsEntry("email", "maya@example.com")
                .containsEntry("instagram", "maya.lines")
                .containsEntry("notes", "מעדיפה קו דק");
    }

    @Test
    void identicalCreateRetryReturnsTheSameRecordWithoutADuplicate() {
        UUID id = UUID.randomUUID();
        Map<String, Object> body = client("תמר אדלר");
        ResponseEntity<Map<String, Object>> first = put(id, body);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map<String, Object>> retry = put(id, body);

        assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(retry.getBody()).isEqualTo(first.getBody());
        assertThat(jdbc.queryForObject("select count(*) from client where id = ?", Integer.class, id)).isEqualTo(1);
    }

    // ---- AC2: validation -----------------------------------------------------------------------

    @Test
    void blankOrTooLongNameIsValidationFailed() {
        assertThat(fields(put(UUID.randomUUID(), client("   ")))).containsKey("name");
        assertThat(fields(put(UUID.randomUUID(), new HashMap<>()))).containsKey("name");
        assertThat(fields(put(UUID.randomUUID(), client("א".repeat(101))))).containsKey("name");
    }

    @Test
    void invalidOptionalFieldsAreValidationFailedPerField() {
        Map<String, Object> body = client("שירה כהן");
        body.put("email", "not-an-email");
        body.put("phone", "123");
        body.put("instagram", "shira cohen");
        body.put("notes", "x".repeat(2001));

        ResponseEntity<Map<String, Object>> res = put(UUID.randomUUID(), body);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fields(res)).containsKeys("email", "phone", "instagram", "notes").doesNotContainKey("name");
    }

    @Test
    void boundaryValuesAreAccepted() {
        Map<String, Object> body = client("א".repeat(100));
        body.put("phone", "+972 54 381 2290");
        body.put("instagram", "a".repeat(30));
        body.put("notes", "x".repeat(2000));

        assertThat(put(UUID.randomUUID(), body).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    // ---- AC3: edit -----------------------------------------------------------------------------

    @Test
    void updateWithCurrentVersionSavesAndBumpsIt() {
        UUID id = create(client("דנה פרידמן"));
        Map<String, Object> edit = client("דנה פרידמן");
        edit.put("phone", "052-111-2233");
        edit.put("version", 0);

        ResponseEntity<Map<String, Object>> res = put(id, edit);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(version(res.getBody())).isEqualTo(1);
        assertThat(get(id).getBody()).containsEntry("phone", "052-111-2233");
    }

    @Test
    @SuppressWarnings("unchecked")
    void staleVersionIs409WithTheCurrentRecord() {
        UUID id = create(client("יעל שגיא"));
        Map<String, Object> iPad = client("יעל שגיא");
        iPad.put("instagram", "yael.s");
        iPad.put("version", 0);
        assertThat(put(id, iPad).getStatusCode()).isEqualTo(HttpStatus.OK);

        // The iPhone still holds version 0 and changes something else.
        Map<String, Object> iPhone = client("יעל שגיא");
        iPhone.put("notes", "מהאייפון");
        iPhone.put("version", 0);
        ResponseEntity<Map<String, Object>> res = put(id, iPhone);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> error = error(res);
        assertThat(error).containsEntry("code", "version_conflict");
        Map<String, Object> current = (Map<String, Object>) ((Map<String, Object>) error.get("details")).get("current");
        assertThat(current).containsEntry("instagram", "yael.s").containsEntry("notes", null);
        assertThat(version(current)).isEqualTo(1);
    }

    // ---- AC4: get + list -----------------------------------------------------------------------

    @Test
    void unknownOrSoftDeletedClientIs404() {
        ResponseEntity<Map<String, Object>> unknown = get(UUID.randomUUID());
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(unknown)).containsEntry("code", "not_found");

        UUID id = create(client("רוני אבן"));
        jdbc.update("update client set deleted_at = now() where id = ?", id);

        assertThat(get(id).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(listIds(null)).doesNotContain(id.toString());
    }

    @Test
    void listIsSortedHebrewAlphabeticallyThenLatin() {
        UUID zoe = create(client("Zoe Adams"));
        UUID tamar = create(client("תמר אדלר"));
        UUID ben = create(client("בן"));
        UUID avigail = create(client("אביגיל"));

        List<String> ours = listIds(null).stream()
                .filter(List.of(zoe, tamar, ben, avigail).stream().map(UUID::toString).toList()::contains)
                .toList();

        assertThat(ours).containsExactly(avigail.toString(), ben.toString(), tamar.toString(), zoe.toString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listItemsCarryTheClientFieldsAndTattooCount() {
        UUID id = create(client("ליה מור"));

        Map<String, Object> item = ((List<Map<String, Object>>) list(null).getBody()).stream()
                .filter(c -> id.toString().equals(c.get("id"))).findFirst().orElseThrow();

        assertThat(item).containsEntry("name", "ליה מור").containsEntry("tattooCount", 0)
                .containsKeys("version", "phone", "email", "instagram", "notes");
    }

    // ---- AC5: search ---------------------------------------------------------------------------

    @Test
    void searchByNameIgnoresFinalLettersNiqqudAndCase() {
        UUID dana = create(client("דנה פרידמן"));
        UUID maya = create(client("Maya Levi"));

        assertThat(listIds("דן")).contains(dana.toString());
        assertThat(listIds("דָּנָה")).contains(dana.toString());
        assertThat(listIds("פרידמנ")).contains(dana.toString());
        assertThat(listIds("MAYA")).contains(maya.toString()).doesNotContain(dana.toString());
    }

    @Test
    void searchByPhoneIgnoresFormattingAndCountryCode() {
        Map<String, Object> body = client("עדי נחום");
        body.put("phone", "054-777-1234");
        UUID id = create(body);

        assertThat(listIds("0547771234")).contains(id.toString());
        assertThat(listIds("054-777")).contains(id.toString());
        assertThat(listIds("+972 54 777")).contains(id.toString());
        // Fewer than 3 digits never matches on the phone.
        assertThat(listIds("77")).doesNotContain(id.toString());
    }

    @Test
    void searchByInstagramIgnoresCaseAndAt() {
        Map<String, Object> body = client("שירה");
        body.put("instagram", "shira.ink");
        UUID id = create(body);

        assertThat(listIds("@shira.i")).contains(id.toString());
        assertThat(listIds("SHIRA.INK")).contains(id.toString());
    }

    @Test
    void mixedCaseInstagramIsSavedLowercaseAndFound() {
        Map<String, Object> body = client("מאיה");
        body.put("instagram", "@Maya.Lines");

        ResponseEntity<Map<String, Object>> res = put(UUID.randomUUID(), body);

        assertThat(res.getStatusCode()).as("AC2: a mixed-case handle is lowercased, not rejected")
                .isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("instagram", "maya.lines");
        assertThat(listIds("MAYA")).contains((String) res.getBody().get("id"));
    }

    @Test
    void searchExcludesNonMatchesAndDeletedClients() {
        UUID id = create(client("גלית ורד"));
        assertThat(listIds("גלית")).contains(id.toString());
        assertThat(listIds("zzz-no-such-client")).doesNotContain(id.toString());

        jdbc.update("update client set deleted_at = now() where id = ?", id);

        assertThat(listIds("גלית")).doesNotContain(id.toString());
    }

    // ---- AC9: auth -----------------------------------------------------------------------------

    @Test
    void everyClientEndpointRequiresTheOwnerToken() {
        HttpEntity<Object> anonymous = new HttpEntity<>(headers(null));
        UUID id = UUID.randomUUID();

        assertThat(rest.exchange("/clients", HttpMethod.GET, anonymous, Object.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.exchange("/clients/" + id, HttpMethod.GET, anonymous, Object.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        ResponseEntity<Map<String, Object>> put =
                rest.exchange("/clients/" + id, HttpMethod.PUT, new HttpEntity<>(client("x"), headers(null)), JSON_OBJECT);
        assertThat(put.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(error(put)).containsEntry("code", "unauthorized");
    }
}
