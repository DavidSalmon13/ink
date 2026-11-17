package app.ink.api.common;

import java.time.Instant;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.BiPredicate;
import java.util.function.Function;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

/**
 * The retry-safe write rules for synced records (AC2–AC4). Create and update are both
 * {@code PUT /<things>/{id}} with the expected {@code version} (absent on create):
 * <ul>
 * <li>no row → insert it (version 0);</li>
 * <li>row equals the payload → return it unchanged (an identical retry, no version bump);</li>
 * <li>version matches → apply the change, version + 1;</li>
 * <li>otherwise → 409 {@code version_conflict} carrying the current record.</li>
 * </ul>
 * Soft-deleted rows read as 404. Controllers pass their own create/compare/apply/view functions, so
 * there's no generic CRUD layer here.
 */
@Component
public class VersionedWrites {

	private final EntityManager em;

	public VersionedWrites(EntityManager em) {
		this.em = em;
	}

	/**
	 * @param expectedVersion the version the client last saw; null when it believes it's creating
	 * @param create builds a new entity with this id from the payload
	 * @param sameAs whether the stored entity already holds exactly this payload
	 * @param apply copies the payload onto the stored entity
	 * @param view the response representation (also used for {@code details.current} on a conflict)
	 */
	@Transactional
	public <E extends SyncedEntity, P, R> R put(Class<E> type, UUID id, Long expectedVersion, P payload,
			Function<P, E> create, BiPredicate<E, P> sameAs, BiConsumer<E, P> apply, Function<E, R> view) {
		E existing = em.find(type, id);
		if (existing == null) {
			E created = create.apply(payload);
			em.persist(created);
			em.flush();
			return view.apply(created);
		}
		if (existing.isDeleted()) {
			throw new ApiException.NotFound();
		}
		if (sameAs.test(existing, payload)) {
			return view.apply(existing);
		}
		if (expectedVersion == null || expectedVersion != existing.getVersion()) {
			throw new ApiException.VersionConflict(view.apply(existing));
		}
		apply.accept(existing, payload);
		em.flush();
		return view.apply(existing);
	}

	/** Updates an existing live record (e.g. the single Settings row); no create path. */
	@Transactional
	public <E extends SyncedEntity, P, R> R update(Class<E> type, UUID id, Long expectedVersion, P payload,
			BiPredicate<E, P> sameAs, BiConsumer<E, P> apply, Function<E, R> view) {
		return put(type, id, expectedVersion, payload, p -> {
			throw new ApiException.NotFound();
		}, sameAs, apply, view);
	}

	/** The live record, or 404 {@code not_found} when it's missing or soft-deleted. */
	@Transactional(readOnly = true)
	public <E extends SyncedEntity, R> R get(Class<E> type, UUID id, Function<E, R> view) {
		E entity = em.find(type, id);
		if (entity == null || entity.isDeleted()) {
			throw new ApiException.NotFound();
		}
		return view.apply(entity);
	}

	/**
	 * Soft delete: sets {@code deletedAt} once. Repeating it, or deleting an id the server never saw
	 * (created offline, deleted before syncing), is a no-op, so the caller always answers 204.
	 */
	@Transactional
	public <E extends SyncedEntity> void softDelete(Class<E> type, UUID id) {
		E entity = em.find(type, id);
		if (entity != null) {
			entity.markDeleted(Instant.now());
		}
	}

}
