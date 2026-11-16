package app.ink.api.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OwnerRepository extends JpaRepository<Owner, UUID> {

	/** The live owner with this email, compared case-insensitively. */
	@Query("select o from Owner o where lower(o.email) = lower(:email) and o.deletedAt is null")
	Optional<Owner> findActiveByEmail(@Param("email") String email);

	/** Every owner not soft-deleted. Ink has a single owner, so the seeder expects at most one. */
	@Query("select o from Owner o where o.deletedAt is null")
	List<Owner> findAllActive();

}
