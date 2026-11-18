package app.ink.api.client;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Normalization for client search (client-list AC5). The same functions run when a client is written
 * (into the {@code search_name}, {@code phone_digits} and {@code instagram_norm} columns) and on the
 * query string, so a substring match on the normalized forms ignores formatting.
 */
final class ClientSearch {

	/** Hebrew points and cantillation marks (U+0591–U+05C7). */
	private static final Pattern NIQQUD = Pattern.compile("[\\u0591-\\u05C7]");
	private static final Pattern SPACES = Pattern.compile("\\s+");
	private static final Pattern NON_DIGITS = Pattern.compile("[^0-9]");

	private ClientSearch() {
	}

	/** Lowercase, niqqud removed, Hebrew final letters mapped to their regular forms, spaces collapsed. */
	static String name(String raw) {
		if (raw == null) {
			return "";
		}
		String s = NIQQUD.matcher(raw).replaceAll("").toLowerCase(Locale.ROOT);
		StringBuilder out = new StringBuilder(s.length());
		for (int i = 0; i < s.length(); i++) {
			out.append(regularForm(s.charAt(i)));
		}
		return SPACES.matcher(out.toString().strip()).replaceAll(" ");
	}

	/** Digits only, a leading {@code 972} replaced by {@code 0}; null when there are no digits. */
	static String phoneDigits(String raw) {
		if (raw == null) {
			return null;
		}
		String digits = NON_DIGITS.matcher(raw).replaceAll("");
		if (digits.isEmpty()) {
			return null;
		}
		return digits.startsWith("972") ? "0" + digits.substring(3) : digits;
	}

	/** Lowercase, trimmed, without a leading {@code @}; null when blank. */
	static String instagram(String raw) {
		String handle = withoutAt(raw);
		return handle == null ? null : handle.toLowerCase(Locale.ROOT);
	}

	/** The normalized phone digits of a query, or null when it has fewer than 3 digits (no phone match). */
	static String phoneQuery(String q) {
		if (q == null || NON_DIGITS.matcher(q).replaceAll("").length() < 3) {
			return null;
		}
		return phoneDigits(q);
	}

	/** Trimmed, without a leading {@code @}, case kept; null when blank. Used for the stored handle. */
	static String withoutAt(String raw) {
		if (raw == null) {
			return null;
		}
		String s = raw.strip();
		if (s.startsWith("@")) {
			s = s.substring(1).strip();
		}
		return s.isEmpty() ? null : s;
	}

	private static char regularForm(char c) {
		return switch (c) {
			case 'ך' -> 'כ';
			case 'ם' -> 'מ';
			case 'ן' -> 'נ';
			case 'ף' -> 'פ';
			case 'ץ' -> 'צ';
			default -> c;
		};
	}
}
