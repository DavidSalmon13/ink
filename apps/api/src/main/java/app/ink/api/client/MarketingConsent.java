package app.ink.api.client;

/** A client's current marketing-consent state, cached from their latest {@link ConsentEvent} (marketing-consent AC1). */
public enum MarketingConsent {
	none, granted, revoked
}
