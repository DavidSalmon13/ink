package app.ink.api.pricing;

/** Rounds minutes up to the next multiple of 5, guarded against float noise just over a multiple. */
public final class RoundUpTo5 {

	/** Absorbs float error just above a multiple of 5 (a product of 60.0000001 → 60, not 65). */
	private static final double EPS = 1e-6;

	private RoundUpTo5() {
	}

	/** Rounds {@code minutes} UP to the next multiple of 5, absorbing float error just above a multiple. */
	public static int roundUpTo5(double minutes) {
		int rounded = (int) (Math.ceil((minutes - EPS) / 5.0) * 5);
		// Math.ceil yields -0.0 for inputs at/just below 0; normalise so the result is a plain 0.
		return rounded == 0 ? 0 : rounded;
	}
}
