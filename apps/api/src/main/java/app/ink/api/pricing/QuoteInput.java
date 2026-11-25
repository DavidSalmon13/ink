package app.ink.api.pricing;

import java.util.List;

/**
 * The input to a pricing calculation: the tattoos of one visit plus the visit-level options. Mirrors the
 * TypeScript {@code QuoteInput} so both pricing copies agree on the shared vectors. {@code placement} is the
 * already-resolved time-estimate tier ({@code easy|medium|hard}); see {@link Estimate#placementTierOf}.
 */
public record QuoteInput(List<Item> items, Options options) {

	public record Item(
			String description,
			String size,
			String detail,
			String shading,
			String placement,
			String designSource,
			/** Hours of custom-design work; billed only when {@code designSource == "custom_design"}. Nullable. */
			Double designHours,
			/** Aya's manual minutes; replaces the estimate for this item when set. Nullable. */
			Integer estimatedMinutesOverride) {
	}

	public record Options(
			int extraNeedles,
			String discountType,
			/** A percent (0–100) when {@code discountType == "percent"}, else integer agorot. */
			long discountValue,
			/** Manual final price in agorot; overrides the computed total when set. Nullable. */
			Long priceOverrideAgorot) {
	}
}
