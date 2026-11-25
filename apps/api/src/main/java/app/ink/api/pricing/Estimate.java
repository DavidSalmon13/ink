package app.ink.api.pricing;

/** The per-item time estimate and the body-placement → tier map. */
public final class Estimate {

	private Estimate() {
	}

	/** estimatedMinutes = roundUpTo5( max(15, product) ) from the size×detail×shading×placement product. */
	public static int estimateMinutesFromProduct(double product) {
		throw new UnsupportedOperationException("T3");
	}

	/** estimatedMinutes = roundUpTo5( max(15, sizeBase × detail × shading × placement) ), reading the tables. */
	public static int estimateItemMinutes(QuoteInput.Item item, PricingSettings.EstimateTables tables) {
		throw new UnsupportedOperationException("T3");
	}

	/** Maps a body-placement id (the Calculator's chips) to its time-estimate tier; unknown ids → fastest. */
	public static String placementTierOf(String placementId) {
		throw new UnsupportedOperationException("T3");
	}
}
