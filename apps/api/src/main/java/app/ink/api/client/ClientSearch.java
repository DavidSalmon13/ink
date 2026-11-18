package app.ink.api.client;

/**
 * Normalization for client search (client-list AC5). The same functions run when a client is written
 * (into the {@code search_name}, {@code phone_digits} and {@code instagram_norm} columns) and on the
 * query string, so a substring match on the normalized forms ignores formatting.
 *
 * <p>Skeleton only (T1, failing-first): implemented in T5.
 */
final class ClientSearch {

	private ClientSearch() {
	}

	/** Lowercase, niqqud removed, Hebrew final letters mapped to their regular forms, spaces collapsed. */
	static String name(String raw) {
		throw new UnsupportedOperationException("T5");
	}

	/** Digits only, a leading {@code 972} replaced by {@code 0}; null when there are no digits. */
	static String phoneDigits(String raw) {
		throw new UnsupportedOperationException("T5");
	}

	/** Lowercase, trimmed, without a leading {@code @}; null when blank. */
	static String instagram(String raw) {
		throw new UnsupportedOperationException("T5");
	}

	/** The normalized phone digits of a query, or null when it has fewer than 3 digits (no phone match). */
	static String phoneQuery(String q) {
		throw new UnsupportedOperationException("T5");
	}
}
