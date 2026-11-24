package app.ink.api.client;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One grant or withdrawal of marketing consent (marketing-consent AC1, AC3). Append-only: never edited or
 * deleted, so it isn't a {@code SyncedEntity}. The server creates it, so the id is server-generated.
 */
@Entity
@Table(name = "consent_event")
public class ConsentEvent {

	@Id
	private UUID id;

	@Column(name = "client_id", nullable = false, updatable = false)
	private UUID clientId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, updatable = false)
	private ConsentAction action;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, updatable = false)
	private ConsentSource source;

	@Column(nullable = false, updatable = false)
	private Instant at;

	protected ConsentEvent() {
	}

	ConsentEvent(UUID clientId, ConsentAction action, ConsentSource source, Instant at) {
		this.id = UUID.randomUUID();
		this.clientId = clientId;
		this.action = action;
		this.source = source;
		this.at = at;
	}

	public UUID getId() {
		return id;
	}

	public UUID getClientId() {
		return clientId;
	}

	public ConsentAction getAction() {
		return action;
	}

	public ConsentSource getSource() {
		return source;
	}

	public Instant getAt() {
		return at;
	}

}
