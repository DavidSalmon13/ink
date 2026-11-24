package app.ink.api.client;

/** Where a consent change came from. Only {@code app} is written in the MVP; the unsubscribe link is Phase 2. */
public enum ConsentSource {
	app, unsubscribe_link
}
