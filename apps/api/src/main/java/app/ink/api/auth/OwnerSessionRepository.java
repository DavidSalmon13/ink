package app.ink.api.auth;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OwnerSessionRepository extends JpaRepository<OwnerSession, UUID> {

	/**
	 * A session that isn't revoked, was used after {@code usedAfter} (the sliding-expiry cutoff), and
	 * whose owner still exists (not soft-deleted).
	 */
	@Query("""
			select s from OwnerSession s
			where s.tokenHash = :tokenHash and s.deletedAt is null and s.lastUsedAt > :usedAfter
			and exists (select 1 from Owner o where o.id = s.ownerId and o.deletedAt is null)""")
	Optional<OwnerSession> findActiveByTokenHash(@Param("tokenHash") String tokenHash, @Param("usedAfter") Instant usedAfter);

	@Query("""
			select s from OwnerSession s
			where s.ownerId = :ownerId and s.deletedAt is null and s.lastUsedAt > :usedAfter
			order by s.lastUsedAt desc""")
	List<OwnerSession> findActiveByOwner(@Param("ownerId") UUID ownerId, @Param("usedAfter") Instant usedAfter);

	/** Revokes every live session of the owner (password change). Returns how many were revoked. */
	@Modifying
	@Query("update OwnerSession s set s.deletedAt = :now where s.ownerId = :ownerId and s.deletedAt is null")
	int revokeAllForOwner(@Param("ownerId") UUID ownerId, @Param("now") Instant now);

}
