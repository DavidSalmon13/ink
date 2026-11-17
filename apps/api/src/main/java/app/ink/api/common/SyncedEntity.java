package app.ink.api.common;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Version;

/**
 * Base for every table the app syncs: a device-generated UUID {@code id}, server-set timestamps (UTC),
 * a soft-delete marker and an optimistic-lock {@code version}. Rows are never hard-deleted; reads skip
 * rows with {@code deletedAt} set. Writes go through {@link VersionedWrites}.
 */
@MappedSuperclass
public abstract class SyncedEntity {

	@Id
	private UUID id;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Column(name = "deleted_at")
	private Instant deletedAt;

	@Version
	@Column(nullable = false)
	private long version;

	protected SyncedEntity() {
	}

	protected SyncedEntity(UUID id) {
		this.id = id;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		this.updatedAt = Instant.now();
	}

	/** Sets {@code deletedAt} once; later calls keep the first timestamp. */
	void markDeleted(Instant now) {
		if (deletedAt == null) {
			deletedAt = now;
		}
	}

	public boolean isDeleted() {
		return deletedAt != null;
	}

	public UUID getId() {
		return id;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	public Instant getDeletedAt() {
		return deletedAt;
	}

	public long getVersion() {
		return version;
	}

}
