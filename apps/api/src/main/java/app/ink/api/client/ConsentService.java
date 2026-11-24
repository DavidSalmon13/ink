package app.ink.api.client;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.ink.api.common.ApiException;
import jakarta.persistence.EntityManager;

/**
 * Grants or withdraws a client's marketing consent (marketing-consent AC3, AC4). One transaction appends
 * the {@link ConsentEvent} and updates the client's cached state; the client's {@code @Version} bump makes a
 * later save from a device holding the old version a 409, like any other change.
 */
@Service
class ConsentService {

	private final EntityManager em;
	private final ConsentEventRepository events;

	ConsentService(EntityManager em, ConsentEventRepository events) {
		this.em = em;
		this.events = events;
	}

	/** The client after the change; unchanged (no event, no version bump) when it already had that state. */
	@Transactional
	Client change(UUID clientId, ConsentAction action) {
		Client client = em.find(Client.class, clientId);
		if (client == null || client.isDeleted()) {
			throw new ApiException.NotFound();
		}
		ConsentEvent event = client.changeConsent(action, Instant.now());
		if (event != null) {
			events.save(event);
			em.flush();
		}
		return client;
	}
}
