package app.ink.api.client;

import java.time.Instant;

/**
 * The client card's computed summary (client-card AC4). Every field is 0 / null until the epics that own
 * the data fill {@link ClientSummaryService}: tattoos (Completed tattoos & gallery), income from completed
 * appointments and the next appointment (Calendar & appointments). The contract doesn't change when they do.
 */
record ClientSummary(int tattooCount, long completedIncomeAgorot, Instant nextAppointmentAt) {

	static final ClientSummary EMPTY = new ClientSummary(0, 0, null);
}
