package app.ink.api.client;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Reads skip soft-deleted rows; writes go through {@code VersionedWrites}. Lists are sorted Hebrew
 * names first, then the rest (Latin), each by code point of the normalized name (AC4).
 */
public interface ClientRepository extends JpaRepository<Client, UUID> {

	String ORDER = " order by case when search_name ~ '^[א-ת]' then 0 else 1 end,"
			+ " search_name collate \"C\", name collate \"C\", id";

	@Query(value = "select * from client where deleted_at is null" + ORDER, nativeQuery = true)
	List<Client> findLive();

	/**
	 * Substring match on the normalized columns (AC5). Callers pass LIKE patterns already escaped with
	 * {@code \}; an empty pattern never matches, because the normalized columns are null rather than empty.
	 */
	@Query(value = "select * from client where deleted_at is null and ("
			+ " search_name like :name escape '\\'"
			+ " or instagram_norm like :instagram escape '\\'"
			+ " or phone_digits like :phone escape '\\')" + ORDER, nativeQuery = true)
	List<Client> search(@Param("name") String name, @Param("instagram") String instagram,
			@Param("phone") String phone);

}
