package app.ink.api.attachment;

import java.util.Objects;
import java.util.UUID;

import app.ink.api.common.SyncedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * A tattoo photo or sketch: metadata here, bytes in the private bucket at {@code storageKey}
 * ({@code attachments/<id>}).
 */
@Entity
@Table(name = "attachment")
public class Attachment extends SyncedEntity {

	@Column(nullable = false)
	private String kind;

	@Column(name = "storage_key", nullable = false, updatable = false)
	private String storageKey;

	@Column(name = "mime_type", nullable = false)
	private String mimeType;

	@Column(name = "size_bytes", nullable = false)
	private long sizeBytes;

	private Integer width;

	private Integer height;

	protected Attachment() {
	}

	Attachment(UUID id, String kind, String mimeType, long sizeBytes, Integer width, Integer height) {
		super(id);
		this.storageKey = "attachments/" + id;
		set(kind, mimeType, sizeBytes, width, height);
	}

	boolean sameAs(String kind, String mimeType, long sizeBytes, Integer width, Integer height) {
		return this.kind.equals(kind) && this.mimeType.equals(mimeType) && this.sizeBytes == sizeBytes
				&& Objects.equals(this.width, width) && Objects.equals(this.height, height);
	}

	void set(String kind, String mimeType, long sizeBytes, Integer width, Integer height) {
		this.kind = kind;
		this.mimeType = mimeType;
		this.sizeBytes = sizeBytes;
		this.width = width;
		this.height = height;
	}

	public String getKind() {
		return kind;
	}

	public String getStorageKey() {
		return storageKey;
	}

	public String getMimeType() {
		return mimeType;
	}

	public long getSizeBytes() {
		return sizeBytes;
	}

	public Integer getWidth() {
		return width;
	}

	public Integer getHeight() {
		return height;
	}

}
