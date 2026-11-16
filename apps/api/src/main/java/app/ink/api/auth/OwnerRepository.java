package app.ink.api.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OwnerRepository extends JpaRepository<Owner, UUID> {

	/** The live owner with this email, compared case-insensitively. */
	@Query("select o from Owner o where lower(o.email) = lower(:email) and o.deletedAt is null")
	Optional<Owner> findActiveByEmail(@Param("email") String email);

}
