package app.ink.api.client;

import java.util.UUID;

import org.springframework.stereotype.Service;

import app.ink.api.common.VersionedWrites;

/** Computes a live client's {@link ClientSummary}; unknown or soft-deleted clients are 404 (client-card AC4). */
@Service
class ClientSummaryService {

	private final VersionedWrites writes;

	ClientSummaryService(VersionedWrites writes) {
		this.writes = writes;
	}

	ClientSummary summarize(UUID clientId) {
		// The read is what enforces "live client"; later epics add their counts and sums here.
		return writes.get(Client.class, clientId, client -> ClientSummary.EMPTY);
	}
}
