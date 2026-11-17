package app.ink.api.attachment;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/** Reads skip soft-deleted rows; writes go through {@code VersionedWrites}. */
public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {

	Optional<Attachment> findByIdAndDeletedAtIsNull(UUID id);

}
