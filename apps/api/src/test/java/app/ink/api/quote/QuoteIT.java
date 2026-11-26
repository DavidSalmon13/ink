// covers save-quote AC3, AC4, T5 (authoritative PUT recompute, read, soft delete)
package app.ink.api.quote;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
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
 * Quotes: {@code PUT /quotes/{id}} create-or-update under the versioned-write rules with the server's
 * authoritative recompute from the seeded {@code Settings} row (client-sent prices ignored), {@code GET}
 * list-by-client / by-id, and the idempotent soft {@code DELETE}. The expected prices below are computed from
 * the V3 seed (min 350 ₪ / 30 min, 330 ₪/h, design 200 ₪/h, extra needle 50 ₪) with the data-model estimate
 * tables, so they are the same numbers the mobile preview shows for the same input (AC7). Tests share one
 * database, so each creates its own client and quotes with fresh UUIDs and asserts on those ids only.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.auth.owner-email=" + QuoteIT.EMAIL,
                "app.auth.owner-password-hash=" + QuoteIT.PASSWORD_HASH,
        })
@Testcontainers
class QuoteIT {

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
            Map<String, Object> body =
                    Map.of("email", EMAIL, "password", PASSWORD, "deviceName", "iPad", "platform", "ios");
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

    private ResponseEntity<Map<String, Object>> putQuote(UUID id, Map<String, Object> body) {
        return rest.exchange("/quotes/" + id, HttpMethod.PUT, new HttpEntity<>(body, headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Map<String, Object>> getQuote(UUID id) {
        return rest.exchange("/quotes/" + id, HttpMethod.GET, new HttpEntity<>(headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Map<String, Object>> deleteQuote(UUID id) {
        return rest.exchange("/quotes/" + id, HttpMethod.DELETE, new HttpEntity<>(headers(token())), JSON_OBJECT);
    }

    private ResponseEntity<Object> listByClient(UUID clientId) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromPath("/quotes").queryParam("clientId", clientId);
        return rest.exchange(uri.encode().build().toUri(), HttpMethod.GET,
                new HttpEntity<>(headers(token())), Object.class);
    }

    @SuppressWarnings("unchecked")
    private List<String> listIds(UUID clientId) {
        ResponseEntity<Object> res = listByClient(clientId);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).as("GET /quotes returns a JSON array").isInstanceOf(List.class);
        return ((List<Map<String, Object>>) res.getBody()).stream().map(q -> (String) q.get("id")).toList();
    }

    /** Creates a client via the clients API and returns its id. */
    private UUID createClient(String name) {
        UUID id = UUID.randomUUID();
        ResponseEntity<Map<String, Object>> res = rest.exchange("/clients/" + id, HttpMethod.PUT,
                new HttpEntity<>(Map.of("name", name), headers(token())), JSON_OBJECT);
        assertThat(res.getStatusCode()).as("create client %s", name).isEqualTo(HttpStatus.OK);
        return id;
    }

    /** One tattoo item; the time-affecting fields only, with sensible defaults for the rest. */
    private static Map<String, Object> item(int position, String size, String detail, String shading,
            String placement, String designSource) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", UUID.randomUUID().toString());
        m.put("position", position);
        m.put("description", "פרח");
        m.put("size", size);
        m.put("detailLevel", detail);
        m.put("shading", shading);
        m.put("bodyPlacement", placement);
        m.put("designSource", designSource);
        return m;
    }

    /** A minimal valid quote body (no discount, no extra needles) for {@code clientId}. */
    private static Map<String, Object> quote(UUID clientId, String title, Map<String, Object>... items) {
        Map<String, Object> m = new HashMap<>();
        m.put("clientId", clientId.toString());
        m.put("title", title);
        m.put("discountType", "none");
        m.put("discountValue", 0);
        m.put("extraNeedles", 0);
        List<Map<String, Object>> list = new ArrayList<>(List.of(items));
        m.put("items", list);
        return m;
    }

    private UUID createQuote(Map<String, Object> body) {
        UUID id = UUID.randomUUID();
        ResponseEntity<Map<String, Object>> res = putQuote(id, body);
        assertThat(res.getStatusCode()).as("create quote %s", body.get("title")).isEqualTo(HttpStatus.OK);
        return id;
    }

    private static long version(Map<String, Object> record) {
        return ((Number) record.get("version")).longValue();
    }

    private static long money(Map<String, Object> record, String key) {
        return ((Number) record.get(key)).longValue();
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

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> items(Map<String, Object> record) {
        return (List<Map<String, Object>>) record.get("items");
    }

    // ---- AC3: create + authoritative recompute -------------------------------------------------

    @Test
    void createReturnsTheQuoteAtVersion0WithServerComputedPrices() {
        UUID client = createClient("נועה ברק");
        UUID id = UUID.randomUUID();

        // One M / medium / none / forearm (easy) / artist_sketch item: estimate 75 min; base only.
        ResponseEntity<Map<String, Object>> res =
                putQuote(id, quote(client, "פרח יד", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> q = res.getBody();
        assertThat(q).containsEntry("id", id.toString()).containsEntry("clientId", client.toString())
                .containsEntry("title", "פרח יד");
        assertThat(version(q)).isZero();
        assertThat(money(q, "estimatedMinutesTotal")).isEqualTo(75);
        assertThat(money(q, "computedPriceAgorot")).isEqualTo(59750);
        assertThat(money(q, "finalPriceAgorot")).isEqualTo(59750);
        assertThat(items(q)).hasSize(1);
        assertThat(money(items(q).get(0), "estimatedMinutes")).isEqualTo(75);
    }

    @Test
    void theServerRecomputesAndIgnoresClientSentPricesAndMinutes() {
        UUID client = createClient("מאיה לוי");
        Map<String, Object> body = quote(client, "זרוע",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        // A hostile / stale client sends its own totals; the server must overwrite them from Settings.
        body.put("computedPriceAgorot", 1);
        body.put("finalPriceAgorot", 2);
        body.put("estimatedMinutesTotal", 999);
        items(body).get(0).put("estimatedMinutes", 999);

        Map<String, Object> q = putQuote(UUID.randomUUID(), body).getBody();

        assertThat(money(q, "computedPriceAgorot")).isEqualTo(59750);
        assertThat(money(q, "finalPriceAgorot")).isEqualTo(59750);
        assertThat(money(q, "estimatedMinutesTotal")).isEqualTo(75);
        assertThat(money(items(q).get(0), "estimatedMinutes")).isEqualTo(75);
    }

    @Test
    void designFeeExtraNeedlesAndDiscountAllFoldIntoTheComputedPrice() {
        UUID client = createClient("תמר אדלר");
        // M/medium/none/forearm custom_design 2h: base 59750 + design 40000 + 2 needles 10000 = 109750,
        // then 10% off → 109750 − round(10975) = 98775.
        Map<String, Object> item = item(0, "M", "medium", "none", "forearm", "custom_design");
        item.put("designHours", 2.0);
        Map<String, Object> body = quote(client, "חצי שרוול", item);
        body.put("extraNeedles", 2);
        body.put("discountType", "percent");
        body.put("discountValue", 10);

        Map<String, Object> q = putQuote(UUID.randomUUID(), body).getBody();

        assertThat(money(q, "computedPriceAgorot")).isEqualTo(98775);
        assertThat(money(q, "finalPriceAgorot")).isEqualTo(98775);
    }

    @Test
    void aPriceOverrideReplacesTheFinalPriceButNotTheComputedOne() {
        UUID client = createClient("דנה פרידמן");
        Map<String, Object> body = quote(client, "קבוע",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        body.put("priceOverrideAgorot", 40000);

        Map<String, Object> q = putQuote(UUID.randomUUID(), body).getBody();

        assertThat(money(q, "computedPriceAgorot")).isEqualTo(59750);
        assertThat(money(q, "finalPriceAgorot")).isEqualTo(40000);
    }

    @Test
    void visitMinutesSumItemsUsingEachItemsOverrideWhenSet() {
        UUID client = createClient("יעל שגיא");
        Map<String, Object> second = item(1, "S", "simple", "none", "forearm", "artist_sketch");
        second.put("estimatedMinutesOverride", 50);
        Map<String, Object> body = quote(client, "שתי עבודות",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"), second);

        Map<String, Object> q = putQuote(UUID.randomUUID(), body).getBody();

        // item 0 estimate 75, item 1 estimate 35 but overridden to 50 → visit 125 min.
        assertThat(money(q, "estimatedMinutesTotal")).isEqualTo(125);
        assertThat(money(items(q).get(0), "estimatedMinutes")).isEqualTo(75);
        assertThat(money(items(q).get(1), "estimatedMinutes")).isEqualTo(35);
        // base = 35000 + round((125−30) × 33000 / 60) = 35000 + 52250 = 87250.
        assertThat(money(q, "computedPriceAgorot")).isEqualTo(87250);
    }

    @Test
    void savingAQuoteNeverCreatesAnAppointment() {
        UUID client = createClient("רוני אבן");
        createQuote(quote(client, "בלי תור", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        assertThat(jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_name = 'appointment'", Long.class))
                .as("no appointment table exists in this epic, so saving a quote cannot book one").isZero();
    }

    // ---- AC3: versioned-write rules ------------------------------------------------------------

    @Test
    void identicalCreateRetryReturnsTheSameRecordWithoutADuplicate() {
        UUID client = createClient("ליה מור");
        UUID id = UUID.randomUUID();
        Map<String, Object> body = quote(client, "חזרה",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        ResponseEntity<Map<String, Object>> first = putQuote(id, body);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map<String, Object>> retry = putQuote(id, body);

        assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(version(retry.getBody())).isZero();
        assertThat(jdbc.queryForObject("select count(*) from quote where id = ?", Integer.class, id)).isEqualTo(1);
    }

    @Test
    void updateWithTheCurrentVersionSavesAndBumpsIt() {
        UUID client = createClient("נטע ברזילי");
        UUID id = createQuote(quote(client, "כותרת", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        Map<String, Object> edit = quote(client, "כותרת חדשה",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        edit.put("version", 0);
        ResponseEntity<Map<String, Object>> res = putQuote(id, edit);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(version(res.getBody())).isEqualTo(1);
        assertThat(getQuote(id).getBody()).containsEntry("title", "כותרת חדשה");
    }

    @Test
    @SuppressWarnings("unchecked")
    void aStaleVersionIs409WithTheCurrentRecord() {
        UUID client = createClient("אורי");
        UUID id = createQuote(quote(client, "מקורי", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        Map<String, Object> iPad = quote(client, "מהאייפד",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        iPad.put("version", 0);
        assertThat(putQuote(id, iPad).getStatusCode()).isEqualTo(HttpStatus.OK);

        // The iPhone still holds version 0.
        Map<String, Object> iPhone = quote(client, "מהאייפון",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        iPhone.put("version", 0);
        ResponseEntity<Map<String, Object>> res = putQuote(id, iPhone);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> error = error(res);
        assertThat(error).containsEntry("code", "version_conflict");
        Map<String, Object> current = (Map<String, Object>) ((Map<String, Object>) error.get("details")).get("current");
        assertThat(current).containsEntry("title", "מהאייפד");
        assertThat(version(current)).isEqualTo(1);
    }

    @Test
    void puttingToASoftDeletedQuoteIs404() {
        UUID client = createClient("מיכל");
        UUID id = createQuote(quote(client, "נמחק", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        jdbc.update("update quote set deleted_at = now() where id = ?", id);

        Map<String, Object> edit = quote(client, "חזרה",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        edit.put("version", 0);

        assertThat(putQuote(id, edit).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ---- AC3: validation -----------------------------------------------------------------------

    @Test
    void aMissingClientIsValidationFailed() {
        Map<String, Object> body = quote(UUID.randomUUID(), "ללא לקוח",
                item(0, "M", "medium", "none", "forearm", "artist_sketch"));
        body.remove("clientId");

        ResponseEntity<Map<String, Object>> res = putQuote(UUID.randomUUID(), body);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fields(res)).containsKey("clientId");
    }

    @Test
    void anUnknownOrDeletedClientIs404() {
        ResponseEntity<Map<String, Object>> unknown = putQuote(UUID.randomUUID(),
                quote(UUID.randomUUID(), "לקוח לא קיים", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error(unknown)).containsEntry("code", "not_found");

        UUID client = createClient("דור");
        jdbc.update("update client set deleted_at = now() where id = ?", client);
        ResponseEntity<Map<String, Object>> dead = putQuote(UUID.randomUUID(),
                quote(client, "לקוח מחוק", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        assertThat(dead.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ---- AC4: read + delete --------------------------------------------------------------------

    @Test
    void listByClientReturnsOnlyThatClientsLiveQuotesNewestFirst() {
        UUID client = createClient("גלית ורד");
        UUID other = createClient("אחר");
        UUID first = createQuote(quote(client, "ראשונה", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        UUID second = createQuote(quote(client, "שנייה", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        UUID third = createQuote(quote(client, "שלישית", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        UUID elsewhere = createQuote(quote(other, "אחרת", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        List<String> ids = listIds(client);

        assertThat(ids).containsExactly(third.toString(), second.toString(), first.toString());
        assertThat(ids).doesNotContain(elsewhere.toString());
    }

    @Test
    void listExcludesSoftDeletedQuotes() {
        UUID client = createClient("ענבר");
        UUID kept = createQuote(quote(client, "נשארת", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        UUID gone = createQuote(quote(client, "נמחקת", item(0, "M", "medium", "none", "forearm", "artist_sketch")));
        jdbc.update("update quote set deleted_at = now() where id = ?", gone);

        assertThat(listIds(client)).containsExactly(kept.toString()).doesNotContain(gone.toString());
    }

    @Test
    void getByIdReturnsTheStoredPricesAndItemsAndUnknownOrDeletedIs404() {
        UUID client = createClient("שקד");
        UUID id = createQuote(quote(client, "לקריאה", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        Map<String, Object> q = getQuote(id).getBody();
        assertThat(q).containsEntry("id", id.toString());
        assertThat(money(q, "computedPriceAgorot")).isEqualTo(59750);
        assertThat(items(q)).hasSize(1);

        assertThat(getQuote(UUID.randomUUID()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        jdbc.update("update quote set deleted_at = now() where id = ?", id);
        assertThat(getQuote(id).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void refetchingAQuoteReproducesTheSameNumbers() {
        UUID client = createClient("אגם");
        UUID id = createQuote(quote(client, "שחזור", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        Map<String, Object> created = getQuote(id).getBody();
        Map<String, Object> refetched = getQuote(id).getBody();

        assertThat(refetched).containsEntry("computedPriceAgorot", created.get("computedPriceAgorot"))
                .containsEntry("finalPriceAgorot", created.get("finalPriceAgorot"))
                .containsEntry("estimatedMinutesTotal", created.get("estimatedMinutesTotal"));
    }

    @Test
    void deleteIsSoftAndIdempotent() {
        UUID client = createClient("טל");
        UUID id = createQuote(quote(client, "למחיקה", item(0, "M", "medium", "none", "forearm", "artist_sketch")));

        assertThat(deleteQuote(id).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(jdbc.queryForObject("select deleted_at is not null from quote where id = ?", Boolean.class, id))
                .as("the row stays, marked deleted").isTrue();
        assertThat(getQuote(id).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(listIds(client)).doesNotContain(id.toString());

        assertThat(deleteQuote(id).getStatusCode()).as("repeat").isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(deleteQuote(UUID.randomUUID()).getStatusCode()).as("unknown").isEqualTo(HttpStatus.NO_CONTENT);
    }

    // ---- auth ----------------------------------------------------------------------------------

    @Test
    void everyQuoteEndpointRequiresTheOwnerToken() {
        HttpEntity<Object> anonymous = new HttpEntity<>(headers(null));
        UUID id = UUID.randomUUID();

        assertThat(rest.exchange("/quotes?clientId=" + UUID.randomUUID(), HttpMethod.GET, anonymous, Object.class)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.exchange("/quotes/" + id, HttpMethod.GET, anonymous, Object.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        ResponseEntity<Map<String, Object>> put = rest.exchange("/quotes/" + id, HttpMethod.PUT,
                new HttpEntity<>(quote(UUID.randomUUID(), "x", item(0, "M", "medium", "none", "forearm",
                        "artist_sketch")), headers(null)), JSON_OBJECT);
        assertThat(put.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.exchange("/quotes/" + id, HttpMethod.DELETE, anonymous, Object.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
