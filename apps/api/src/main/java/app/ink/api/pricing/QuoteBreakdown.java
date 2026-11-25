package app.ink.api.pricing;

import java.util.List;

/**
 * The computed price of a visit. Every money line is an integer number of agorot; every minute is an integer.
 * Mirrors the TypeScript {@code QuoteBreakdown} ({@code final} is {@code finalPrice} here, {@code final} being a
 * Java keyword). The server stores {@code estimatedMinutesTotal = visitMinutes}, {@code computed} and
 * {@code finalPrice} on the quote.
 */
public record QuoteBreakdown(
		List<Integer> itemsEstimatedMinutes,
		int visitMinutes,
		long base,
		long design,
		long extras,
		long discount,
		long subtotal,
		long computed,
		long finalPrice) {
}
