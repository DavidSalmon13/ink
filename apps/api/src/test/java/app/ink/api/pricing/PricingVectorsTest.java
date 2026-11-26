package app.ink.api.pricing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The authoritative Java pricing must reproduce the shared {@code fixtures/pricing-vectors.json} exactly — the
 * same file the mobile {@code src/pricing} tests read — so the preview and the API never drift (save-quote AC1,
 * architecture.md → Gotchas). The calibration/hint vectors are UI-only and are not checked here.
 */
class PricingVectorsTest {

	private static JsonNode root;
	private static PricingSettings settings;

	@BeforeAll
	static void loadVectors() throws Exception {
		root = new ObjectMapper().readTree(Files.readString(findFixture()));
		settings = parseSettings(root.get("settings"));
	}

	/** The repo-root fixtures file, found by walking up from the test's working directory. */
	private static Path findFixture() {
		Path dir = Paths.get("").toAbsolutePath();
		for (int i = 0; i < 6 && dir != null; i++) {
			Path candidate = dir.resolve("fixtures").resolve("pricing-vectors.json");
			if (Files.exists(candidate)) {
				return candidate;
			}
			dir = dir.getParent();
		}
		throw new IllegalStateException(
				"fixtures/pricing-vectors.json not found from " + Paths.get("").toAbsolutePath());
	}

	@Test
	void roundUpTo5() {
		for (JsonNode v : root.get("roundUpTo5")) {
			assertEquals(v.get("expected").asInt(), RoundUpTo5.roundUpTo5(v.get("input").asDouble()),
					v.path("note").asText());
		}
	}

	@Test
	void estimateFromProduct() {
		for (JsonNode v : root.get("estimateFromProduct")) {
			assertEquals(v.get("expected").asInt(), Estimate.estimateMinutesFromProduct(v.get("product").asDouble()),
					v.path("note").asText());
		}
	}

	@Test
	void cases() {
		for (JsonNode c : root.get("cases")) {
			String name = c.get("name").asText();
			QuoteInput input = new QuoteInput(parseItems(c.get("items")), parseOptions(c.get("options")));
			QuoteBreakdown b = PricingCalculator.calcQuote(input, settings);
			JsonNode exp = c.get("expected");
			assertEquals(intList(exp.get("itemsEstimatedMinutes")), b.itemsEstimatedMinutes(),
					name + " · itemsEstimatedMinutes");
			assertEquals(exp.get("visitMinutes").asInt(), b.visitMinutes(), name + " · visitMinutes");
			assertEquals(exp.get("base").asLong(), b.base(), name + " · base");
			assertEquals(exp.get("design").asLong(), b.design(), name + " · design");
			assertEquals(exp.get("extras").asLong(), b.extras(), name + " · extras");
			assertEquals(exp.get("discount").asLong(), b.discount(), name + " · discount");
			assertEquals(exp.get("subtotal").asLong(), b.subtotal(), name + " · subtotal");
			assertEquals(exp.get("computed").asLong(), b.computed(), name + " · computed");
			assertEquals(exp.get("final").asLong(), b.finalPrice(), name + " · final");
		}
	}

	private static PricingSettings parseSettings(JsonNode s) {
		JsonNode t = s.get("estimateTables");
		return new PricingSettings(
				s.get("minimumPriceAgorot").asLong(),
				s.get("minimumMinutes").asInt(),
				s.get("hourlyRateAgorot").asLong(),
				s.get("designHourlyRateAgorot").asLong(),
				s.get("extraNeedleCostAgorot").asLong(),
				new PricingSettings.EstimateTables(intMap(t.get("sizeBaseMinutes")), doubleMap(t.get("detail")),
						doubleMap(t.get("shading")), doubleMap(t.get("placement"))));
	}

	private static List<QuoteInput.Item> parseItems(JsonNode arr) {
		List<QuoteInput.Item> items = new ArrayList<>();
		for (JsonNode it : arr) {
			items.add(new QuoteInput.Item(
					it.path("description").asText(null),
					it.get("size").asText(),
					it.get("detail").asText(),
					it.get("shading").asText(),
					it.get("placement").asText(),
					it.get("designSource").asText(),
					it.hasNonNull("designHours") ? it.get("designHours").asDouble() : null,
					it.hasNonNull("estimatedMinutesOverride") ? it.get("estimatedMinutesOverride").asInt() : null));
		}
		return items;
	}

	private static QuoteInput.Options parseOptions(JsonNode o) {
		return new QuoteInput.Options(
				o.get("extraNeedles").asInt(),
				o.get("discountType").asText(),
				o.get("discountValue").asLong(),
				o.hasNonNull("priceOverrideAgorot") ? o.get("priceOverrideAgorot").asLong() : null);
	}

	private static List<Integer> intList(JsonNode arr) {
		List<Integer> list = new ArrayList<>();
		for (JsonNode n : arr) {
			list.add(n.asInt());
		}
		return list;
	}

	private static Map<String, Integer> intMap(JsonNode n) {
		Map<String, Integer> m = new LinkedHashMap<>();
		n.fields().forEachRemaining(e -> m.put(e.getKey(), e.getValue().asInt()));
		return m;
	}

	private static Map<String, Double> doubleMap(JsonNode n) {
		Map<String, Double> m = new LinkedHashMap<>();
		n.fields().forEachRemaining(e -> m.put(e.getKey(), e.getValue().asDouble()));
		return m;
	}
}
