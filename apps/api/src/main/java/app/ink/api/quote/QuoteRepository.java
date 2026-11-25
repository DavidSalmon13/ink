package app.ink.api.quote;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Reads skip soft-deleted rows; writes go through {@code VersionedWrites}. The client card lists a client's
 * live quotes newest first (AC4).
 */
interface QuoteRepository extends JpaRepository<Quote, UUID> {

	@Query(value = "select * from quote where client_id = :clientId and deleted_at is null"
			+ " order by created_at desc, id", nativeQuery = true)
	List<Quote> findLiveByClientId(@Param("clientId") UUID clientId);

}
