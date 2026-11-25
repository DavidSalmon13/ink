package app.ink.api.pricing;

/**
 * The authoritative visit pricing. The minimum/needle-opening fee is charged once per visit; every money line
 * is an integer number of agorot and every minute an integer. Mirrors the TypeScript {@code calcQuote}.
 */
public final class PricingCalculator {

	private PricingCalculator() {
	}

	/** Agorot the discount subtracts: round(subtotal × value/100) for percent, min(subtotal, value) for amount. */
	public static long applyDiscount(long subtotal, QuoteInput.Options options) {
		throw new UnsupportedOperationException("T3");
	}

	/** Prices a visit from the seeded Settings. */
	public static QuoteBreakdown calcQuote(QuoteInput input, PricingSettings settings) {
		throw new UnsupportedOperationException("T3");
	}
}
