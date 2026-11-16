package app.ink.api.auth;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code app.auth.*}: the seeded owner (from OWNER_EMAIL / OWNER_PASSWORD_HASH) and session timing.
 *
 * @param ownerEmail        the owner's login email; blank = no owner is seeded
 * @param ownerPasswordHash bcrypt hash of the owner's password (from {@code ./gradlew hashPassword})
 * @param sessionTtl        sliding expiry: a session not used for this long stops working
 * @param touchInterval     last_used_at is written at most once per this interval per session
 */
@ConfigurationProperties("app.auth")
public record AuthProperties(String ownerEmail, String ownerPasswordHash, Duration sessionTtl, Duration touchInterval) {

	public AuthProperties {
		ownerEmail = ownerEmail == null ? "" : ownerEmail.trim();
		ownerPasswordHash = ownerPasswordHash == null ? "" : ownerPasswordHash.trim();
		sessionTtl = sessionTtl == null ? Duration.ofDays(90) : sessionTtl;
		touchInterval = touchInterval == null ? Duration.ofHours(1) : touchInterval;
	}

}
