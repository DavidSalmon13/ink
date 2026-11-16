package app.ink.api.auth;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One logged-in device. Only the SHA-256 hash of its opaque token is stored. Revoking sets
 * {@code deletedAt}; rows are never deleted.
 */
@Entity
@Table(name = "owner_session")
public class OwnerSession {

	@Id
	private UUID id;

	@Column(name = "owner_id", nullable = false)
	private UUID ownerId;

	@Column(name = "token_hash", nullable = false, unique = true)
	private String tokenHash;

	@Column(name = "device_name", nullable = false)
	private String deviceName;

	@Column(nullable = false)
	private String platform;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "last_used_at", nullable = false)
	private Instant lastUsedAt;

	@Column(name = "deleted_at")
	private Instant deletedAt;

	protected OwnerSession() {
	}

	public OwnerSession(UUID ownerId, String tokenHash, String deviceName, String platform, Instant now) {
		this.id = UUID.randomUUID();
		this.ownerId = ownerId;
		this.tokenHash = tokenHash;
		this.deviceName = deviceName;
		this.platform = platform;
		this.createdAt = now;
		this.lastUsedAt = now;
	}

	public void touch(Instant now) {
		this.lastUsedAt = now;
	}

	public void revoke(Instant now) {
		if (deletedAt == null) {
			deletedAt = now;
		}
	}

	public UUID getId() {
		return id;
	}

	public UUID getOwnerId() {
		return ownerId;
	}

	public String getDeviceName() {
		return deviceName;
	}

	public String getPlatform() {
		return platform;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getLastUsedAt() {
		return lastUsedAt;
	}

	public Instant getDeletedAt() {
		return deletedAt;
	}

}
