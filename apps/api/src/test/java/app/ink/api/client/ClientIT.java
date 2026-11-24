// covers client-list AC1–AC5, AC9, T2; client-card AC4, AC7, AC9, T1; marketing-consent AC1–AC4, T4
package app.ink.api.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import org.springframework.dao.DataIntegrityViolationException;
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

    private ResponseEntity<Map<String, Object>> consent(UUID id, Object action) {
        Map<String, Object> body = new HashMap<>();
        body.put("action", action);
        return rest.exchange("/clients/" + id + "/consent", HttpMethod.POST,
                new HttpEntity<>(body, headers(token())), JSON_OBJECT);
    }

    /** The audit trail for one client, oldest first, as "action/source". */
    private List<String> consentEvents(UUID id) {
        return jdbc.queryForList("select action || '/' || source from consent_event where client_id = ? order by at",
                String.class, id);
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

    // ---- client-card AC7: soft delete -----------------------------------------------------------

    private ResponseEntity<Map<String, Object>> delete(UUID id) {
        return rest.exchange("/clients/" + id, HttpMethod.DELETE, new HttpEntity<>(headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Map<String, Object>> summary(UUID id) {
        return rest.exchange("/clients/" + id + "/summary", HttpMethod.GET, new HttpEntity<>(headers(token())),
                JSON_OBJECT);
    }

    @Test
    void deleteIsSoftAndHidesTheClientEverywhere() {
        UUID id = create(client("נטע ברזילי"));
        assertThat(listIds("נטע")).contains(id.toString());

        ResponseEntity<Map<String, Object>> res = delete(id);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(jdbc.queryForObject("select deleted_at is not null from client where id = ?", Boolean.class, id))
                .as("the row stays, marked deleted").isTrue();
        assertThat(get(id).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(listIds(null)).doesNotContain(id.toString());
        assertThat(listIds("נטע")).doesNotContain(id.toString());
    }

    @Test
    void deleteIsIdempotent() {
        UUID id = create(client("אורי"));

        assertThat(delete(id).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete(id).getStatusCode()).as("repeat").isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete(UUID.randomUUID()).getStatusCode()).as("unknown").isEqualTo(HttpStatus.NO_CONTENT);
    }

    // ---- client-card AC4: summary ---------------------------------------------------------------

    @Test
    void summaryIsEmptyUntilTheLaterEpics() {
        UUID id = create(client("מיכל"));

        ResponseEntity<Map<String, Object>> res = summary(id);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("tattooCount", 0)
                .containsEntry("completedIncomeAgorot", 0)
                .containsEntry("nextAppointmentAt", null);
    }

    @Test
    void summaryOfAnUnknownOrDeletedClientIs404() {
        ResponseEntity<Map<String, Object>> unknown = summary(UUID.randomUUID());
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(unknown)).containsEntry("code", "not_found");

        UUID id = create(client("דור"));
        jdbc.update("update client set deleted_at = now() where id = ?", id);

        assertThat(summary(id).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ---- AC9: auth -----------------------------------------------------------------------------

    @Test
    void cardEndpointsRequireTheOwnerToken() {
        HttpEntity<Object> anonymous = new HttpEntity<>(headers(null));
        UUID id = create(client("שקד"));

        ResponseEntity<Map<String, Object>> del =
                rest.exchange("/clients/" + id, HttpMethod.DELETE, anonymous, JSON_OBJECT);
        assertThat(del.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(error(del)).containsEntry("code", "unauthorized");
        assertThat(rest.exchange("/clients/" + id + "/summary", HttpMethod.GET, anonymous, Object.class)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(get(id).getStatusCode()).as("the anonymous DELETE didn't delete").isEqualTo(HttpStatus.OK);
    }

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

    // ---- marketing-consent AC1: schema + token --------------------------------------------------

    @Test
    void everyClientHasAUniqueUnsubscribeTokenThatTheApiNeverSends() {
        UUID a = create(client("טל"));
        UUID b = create(client("עדי"));

        String tokenA = jdbc.queryForObject("select unsubscribe_token from client where id = ?", String.class, a);
        String tokenB = jdbc.queryForObject("select unsubscribe_token from client where id = ?", String.class, b);
        assertThat(tokenA).hasSize(43).isNotEqualTo(tokenB);
        assertThat(jdbc.queryForObject("select count(*) from client where unsubscribe_token is null", Long.class))
                .as("backfilled and not null").isZero();
        assertThat(jdbc.queryForObject("select count(distinct unsubscribe_token) = count(*) from client", Boolean.class))
                .isTrue();

        assertThat(get(a).getBody()).doesNotContainKey("unsubscribeToken");
        assertThat(list(null).getBody().toString()).doesNotContain(tokenA);
        assertThat(consent(a, "granted").getBody()).doesNotContainKey("unsubscribeToken");
    }

    @Test
    void theMigrationDefaultsConsentToNoneAndRejectsUnknownStates() {
        UUID id = create(client("ליה"));

        assertThat(jdbc.queryForObject("select marketing_consent from client where id = ?", String.class, id))
                .isEqualTo("none");
        assertThat(jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_name = 'consent_event'"
                        + " and column_name in ('id', 'client_id', 'action', 'source', 'at')", Long.class))
                .isEqualTo(5);
        assertThatThrownBy(
                () -> jdbc.update("update client set marketing_consent = 'maybe' where id = ?", id))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ---- marketing-consent AC2: consent on the client API ---------------------------------------

    @Test
    void getListAndPutCarryConsentAndPutIgnoresIt() {
        UUID id = create(client("נגה"));

        Map<String, Object> fresh = get(id).getBody();
        assertThat(fresh).containsEntry("marketingConsent", "none").containsEntry("consentUpdatedAt", null);
        assertThat(listIds("נגה")).contains(id.toString());

        Map<String, Object> body = client("נגה");
        body.put("notes", "חדש");
        body.put("version", 0);
        body.put("marketingConsent", "granted");
        body.put("consentUpdatedAt", "2026-01-01T00:00:00Z");
        ResponseEntity<Map<String, Object>> res = put(id, body);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("notes", "חדש")
                .containsEntry("marketingConsent", "none")
                .containsEntry("consentUpdatedAt", null);
        assertThat(consentEvents(id)).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void listItemsCarryConsent() {
        UUID id = create(client("אגם קונסנט"));
        consent(id, "granted");

        Map<String, Object> item = ((List<Map<String, Object>>) list("אגם קונסנט").getBody()).stream()
                .filter(c -> c.get("id").equals(id.toString())).findFirst().orElseThrow();
        assertThat(item).containsEntry("marketingConsent", "granted");
        assertThat(item.get("consentUpdatedAt")).isNotNull();
    }

    // ---- marketing-consent AC3: grant / revoke --------------------------------------------------

    @Test
    void grantThenRevokeWritesOneEventEachAndUpdatesTheClient() {
        UUID id = create(client("שירה"));

        ResponseEntity<Map<String, Object>> granted = consent(id, "granted");
        assertThat(granted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(granted.getBody()).containsEntry("id", id.toString()).containsEntry("marketingConsent", "granted");
        String grantedAt = (String) granted.getBody().get("consentUpdatedAt");
        assertThat(grantedAt).isNotNull();
        assertThat(consentEvents(id)).containsExactly("granted/app");

        ResponseEntity<Map<String, Object>> revoked = consent(id, "revoked");
        assertThat(revoked.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(revoked.getBody()).containsEntry("marketingConsent", "revoked");
        assertThat((String) revoked.getBody().get("consentUpdatedAt")).isGreaterThanOrEqualTo(grantedAt);
        assertThat(consentEvents(id)).containsExactly("granted/app", "revoked/app");

        assertThat(get(id).getBody()).containsEntry("marketingConsent", "revoked")
                .containsEntry("consentUpdatedAt", revoked.getBody().get("consentUpdatedAt"));
        assertThat(jdbc.queryForObject(
                "select count(*) from consent_event e join client c on c.id = e.client_id"
                        + " where e.client_id = ? and e.at = c.consent_updated_at and e.action = 'revoked'",
                Long.class, id)).as("the cached state matches the latest event").isEqualTo(1);
    }

    @Test
    void theSameStateAgainIsANoOpWithoutAnEvent() {
        UUID id = create(client("אור"));
        Map<String, Object> first = consent(id, "granted").getBody();

        ResponseEntity<Map<String, Object>> again = consent(id, "granted");

        assertThat(again.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(again.getBody()).isEqualTo(first);
        assertThat(consentEvents(id)).containsExactly("granted/app");
    }

    @Test
    void aBadOrMissingActionIs400ValidationFailed() {
        UUID id = create(client("גל"));

        for (Object action : new Object[] { "maybe", "none", null }) {
            ResponseEntity<Map<String, Object>> res = consent(id, action);
            assertThat(res.getStatusCode()).as("action %s", action).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(fields(res)).containsKey("action");
        }
        assertThat(consentEvents(id)).isEmpty();
        assertThat(get(id).getBody()).containsEntry("marketingConsent", "none");
    }

    @Test
    void consentForAnUnknownOrDeletedClientIs404() {
        ResponseEntity<Map<String, Object>> unknown = consent(UUID.randomUUID(), "granted");
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(unknown)).containsEntry("code", "not_found");

        UUID id = create(client("ים"));
        jdbc.update("update client set deleted_at = now() where id = ?", id);

        ResponseEntity<Map<String, Object>> deleted = consent(id, "granted");
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(deleted)).containsEntry("code", "not_found");
        assertThat(consentEvents(id)).isEmpty();
    }

    @Test
    void consentRequiresTheOwnerToken() {
        UUID id = create(client("ענבר"));

        ResponseEntity<Map<String, Object>> res = rest.exchange("/clients/" + id + "/consent", HttpMethod.POST,
                new HttpEntity<>(Map.of("action", "granted"), headers(null)), JSON_OBJECT);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(error(res)).containsEntry("code", "unauthorized");
        assertThat(consentEvents(id)).isEmpty();
    }

    // ---- marketing-consent AC4: version ---------------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void changingConsentBumpsTheVersionSoAStaleSaveIs409() {
        UUID id = create(client("רותם"));

        Map<String, Object> granted = consent(id, "granted").getBody();
        assertThat(version(granted)).isEqualTo(1);

        // A device that still holds version 0 saves an edit.
        Map<String, Object> stale = client("רותם");
        stale.put("notes", "מהמכשיר השני");
        stale.put("version", 0);
        ResponseEntity<Map<String, Object>> res = put(id, stale);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> error = error(res);
        assertThat(error).containsEntry("code", "version_conflict");
        Map<String, Object> current = (Map<String, Object>) ((Map<String, Object>) error.get("details")).get("current");
        assertThat(current).containsEntry("marketingConsent", "granted").doesNotContainKey("unsubscribeToken");
        assertThat(version(current)).isEqualTo(1);

        stale.put("version", 1);
        assertThat(put(id, stale).getStatusCode()).as("the current version saves").isEqualTo(HttpStatus.OK);
    }
}
