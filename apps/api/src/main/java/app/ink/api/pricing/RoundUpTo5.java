package app.ink.api.pricing;

/** Rounds minutes up to the next multiple of 5, guarded against float noise just over a multiple. */
public final class RoundUpTo5 {

	private RoundUpTo5() {
	}

	/** Rounds {@code minutes} UP to the next multiple of 5, absorbing float error just above a multiple. */
	public static int roundUpTo5(double minutes) {
		throw new UnsupportedOperationException("T3");
	}
}
