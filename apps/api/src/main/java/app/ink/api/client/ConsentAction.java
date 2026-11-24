package app.ink.api.client;

/** What a {@link ConsentEvent} records: the client agreed to marketing messages, or withdrew. */
public enum ConsentAction {
	granted, revoked;

	/** The client state this action leads to. */
	MarketingConsent state() {
		return this == granted ? MarketingConsent.granted : MarketingConsent.revoked;
	}
}
