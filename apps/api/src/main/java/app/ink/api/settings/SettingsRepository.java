package app.ink.api.settings;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SettingsRepository extends JpaRepository<Settings, UUID> {

	/** The single live row (V3 seeds it; a unique index forbids a second one). */
	Optional<Settings> findFirstByDeletedAtIsNull();

}
