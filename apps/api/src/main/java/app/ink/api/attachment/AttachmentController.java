package app.ink.api.attachment;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.ink.api.common.ApiException;
import app.ink.api.common.VersionedWrites;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Attachments (AC7): {@code PUT /attachments/{id}} records the metadata and returns a presigned upload
 * URL; {@code GET /attachments/{id}/download-url} returns a presigned download URL; {@code DELETE}
 * soft-deletes. PUT follows the versioned-write rules (AC2–AC4).
 */
@RestController
@RequestMapping("/attachments")
class AttachmentController {

	static final Set<String> MIME_TYPES = Set.of("image/jpeg", "image/png", "image/heic", "image/webp");
	/** 15 MB (15 × 1024 × 1024 bytes); matches the check in V4__attachment.sql. */
	static final long MAX_BYTES = 15L * 1024 * 1024;

	record AttachmentInput(
			Long version,
			@NotNull @Pattern(regexp = "tattoo_photo|sketch") String kind,
			@NotNull String mimeType,
			@NotNull @Min(1) Long sizeBytes,
			@Min(1) Integer width,
			@Min(1) Integer height) {
	}

	record AttachmentView(UUID id, long version, Instant createdAt, Instant updatedAt, String kind,
			String mimeType, long sizeBytes, Integer width, Integer height, String uploadUrl) {
	}

	record DownloadUrl(String downloadUrl) {
	}

	private final VersionedWrites writes;
	private final StorageService storage;

	AttachmentController(VersionedWrites writes, StorageService storage) {
		this.writes = writes;
		this.storage = storage;
	}

	@PutMapping("/{id}")
	AttachmentView put(@PathVariable UUID id, @Valid @RequestBody AttachmentInput in) {
		if (!MIME_TYPES.contains(in.mimeType())) {
			throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type",
					"Only JPEG, PNG, HEIC and WebP images are supported");
		}
		if (in.sizeBytes() > MAX_BYTES) {
			throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "payload_too_large", "Images can be up to 15 MB");
		}
		return writes.put(Attachment.class, id, in.version(), in,
				p -> new Attachment(id, p.kind(), p.mimeType(), p.sizeBytes(), p.width(), p.height()),
				(a, p) -> a.sameAs(p.kind(), p.mimeType(), p.sizeBytes(), p.width(), p.height()),
				(a, p) -> a.set(p.kind(), p.mimeType(), p.sizeBytes(), p.width(), p.height()),
				this::view);
	}

	@GetMapping("/{id}/download-url")
	DownloadUrl downloadUrl(@PathVariable UUID id) {
		return writes.get(Attachment.class, id, a -> new DownloadUrl(storage.downloadUrl(a.getStorageKey())));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable UUID id) {
		writes.softDelete(Attachment.class, id);
	}

	private AttachmentView view(Attachment a) {
		return new AttachmentView(a.getId(), a.getVersion(), a.getCreatedAt(), a.getUpdatedAt(), a.getKind(),
				a.getMimeType(), a.getSizeBytes(), a.getWidth(), a.getHeight(),
				storage.uploadUrl(a.getStorageKey(), a.getMimeType(), a.getSizeBytes()));
	}

}
