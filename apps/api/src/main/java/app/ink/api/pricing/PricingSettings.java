package app.ink.api.pricing;

import java.util.Map;

/**
 * The pricing inputs read from the seeded {@code Settings} row — the pure-pricing view of it, with no JPA
 * or Spring. {@link app.ink.api.quote.QuoteService} builds this from the {@code Settings} entity.
 * {@code needleOpeningCostAgorot} and {@code calibrationPoints} are not read by the calculation, so they are
 * omitted here. Mirrors the TypeScript {@code Settings}/{@code EstimateTables} the mobile preview uses, so both
 * copies agree on {@code fixtures/pricing-vectors.json}.
 */
public record PricingSettings(
		long minimumPriceAgorot,
		int minimumMinutes,
		long hourlyRateAgorot,
		long designHourlyRateAgorot,
		long extraNeedleCostAgorot,
		EstimateTables estimateTables) {

	/** The size base minutes and the detail/shading/placement multipliers, keyed by the enum string values. */
	public record EstimateTables(
			Map<String, Integer> sizeBaseMinutes,
			Map<String, Double> detail,
			Map<String, Double> shading,
			Map<String, Double> placement) {
	}
}
