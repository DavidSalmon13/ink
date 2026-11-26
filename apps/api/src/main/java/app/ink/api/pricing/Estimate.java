package app.ink.api.pricing;

import java.util.Map;

/** The per-item time estimate and the body-placement → tier map. */
public final class Estimate {

	/** Visit time never drops below this many minutes per item. */
	private static final int MIN_ITEM_MINUTES = 15;

	/**
	 * Body-placement id (the Calculator's chips) → time-estimate tier. The MVP exposes the easy and medium
	 * placements as chips; the hard tier exists in the tables but has no chips yet (spec Out of Scope).
	 */
	private static final Map<String, String> PLACEMENT_TIER = Map.ofEntries(
			Map.entry("forearm", "easy"), Map.entry("arm", "easy"), Map.entry("thigh", "easy"),
			Map.entry("calf", "easy"), Map.entry("back", "medium"), Map.entry("shoulder", "medium"),
			Map.entry("chest", "medium"), Map.entry("wrist", "medium"), Map.entry("ankle", "medium"),
			Map.entry("ribs", "hard"), Map.entry("neck", "hard"), Map.entry("hands", "hard"),
			Map.entry("feet", "hard"), Map.entry("spine", "hard"), Map.entry("sternum", "hard"));

	private Estimate() {
	}

	/** estimatedMinutes = roundUpTo5( max(15, product) ) from the size×detail×shading×placement product. */
	public static int estimateMinutesFromProduct(double product) {
		return RoundUpTo5.roundUpTo5(Math.max(MIN_ITEM_MINUTES, product));
	}

	/** estimatedMinutes = roundUpTo5( max(15, sizeBase × detail × shading × placement) ), reading the tables. */
	public static int estimateItemMinutes(QuoteInput.Item item, PricingSettings.EstimateTables tables) {
		double product = tables.sizeBaseMinutes().get(item.size())
				* tables.detail().get(item.detail())
				* tables.shading().get(item.shading())
				* tables.placement().get(item.placement());
		return estimateMinutesFromProduct(product);
	}

	/** Maps a body-placement id to its time-estimate tier; unknown ids fall back to the fastest tier. */
	public static String placementTierOf(String placementId) {
		return PLACEMENT_TIER.getOrDefault(placementId, "easy");
	}
}
