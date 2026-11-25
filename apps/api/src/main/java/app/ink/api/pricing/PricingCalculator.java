package app.ink.api.pricing;

import java.util.ArrayList;
import java.util.List;

/**
 * The authoritative visit pricing. The minimum/needle-opening fee is charged once per visit; every money line
 * is an integer number of agorot and every minute an integer. Mirrors the TypeScript {@code calcQuote}.
 */
public final class PricingCalculator {

	private PricingCalculator() {
	}

	/** Agorot the discount subtracts: round(subtotal × value/100) for percent, min(subtotal, value) for amount. */
	public static long applyDiscount(long subtotal, QuoteInput.Options options) {
		return switch (options.discountType()) {
			case "percent" -> Math.round((double) subtotal * options.discountValue() / 100.0);
			case "amount" -> Math.min(subtotal, options.discountValue());
			default -> 0L;
		};
	}

	/** Prices a visit from the seeded Settings. */
	public static QuoteBreakdown calcQuote(QuoteInput input, PricingSettings settings) {
		List<QuoteInput.Item> items = input.items();

		List<Integer> itemsEstimatedMinutes = new ArrayList<>(items.size());
		int visitMinutes = 0;
		for (QuoteInput.Item item : items) {
			int estimated = Estimate.estimateItemMinutes(item, settings.estimateTables());
			itemsEstimatedMinutes.add(estimated);
			Integer override = item.estimatedMinutesOverride();
			visitMinutes += override != null ? override : estimated;
		}

		long extraMinutes = Math.max(0, visitMinutes - settings.minimumMinutes());
		long base = settings.minimumPriceAgorot()
				+ Math.round((double) (extraMinutes * settings.hourlyRateAgorot()) / 60.0);

		long design = 0;
		for (QuoteInput.Item item : items) {
			if ("custom_design".equals(item.designSource())) {
				double hours = item.designHours() != null ? item.designHours() : 0.0;
				design += Math.round(hours * settings.designHourlyRateAgorot());
			}
		}

		long extras = (long) input.options().extraNeedles() * settings.extraNeedleCostAgorot();
		long subtotal = base + design + extras;

		long discount = applyDiscount(subtotal, input.options());
		long computed = Math.max(0, subtotal - discount);
		Long override = input.options().priceOverrideAgorot();
		long finalPrice = override != null ? override : computed;

		return new QuoteBreakdown(itemsEstimatedMinutes, visitMinutes, base, design, extras, discount, subtotal,
				computed, finalPrice);
	}
}
