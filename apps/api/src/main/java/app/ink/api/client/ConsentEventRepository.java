package app.ink.api.client;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/** The consent audit trail (marketing-consent AC1). Nothing reads it in the MVP besides tests. */
interface ConsentEventRepository extends JpaRepository<ConsentEvent, UUID> {

	List<ConsentEvent> findByClientIdOrderByAtAsc(UUID clientId);

}
