package app.ink.api.auth;

import java.time.Clock;
import java.util.Locale;
import java.util.List;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the single owner from OWNER_EMAIL / OWNER_PASSWORD_HASH ({@code app.auth.*}) on startup:
 * creates the owner, or updates the stored hash when it changed and then revokes every session, so
 * a password reset logs out all devices. With no config and no owner, the API still starts, logs a
 * warning, and every login fails. Never logs the hash.
 */
@Component
public class OwnerSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(OwnerSeeder.class);
	private static final Pattern BCRYPT = Pattern.compile("^\\$2[aby]?\\$\\d{2}\\$[./A-Za-z0-9]{53}$");

	private final AuthProperties props;
	private final OwnerRepository owners;
	private final SessionTokenService tokens;
	private final Clock clock;

	public OwnerSeeder(AuthProperties props, OwnerRepository owners, SessionTokenService tokens, Clock clock) {
		this.props = props;
		this.owners = owners;
		this.tokens = tokens;
		this.clock = clock;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		String email = props.ownerEmail().toLowerCase(Locale.ROOT);
		String hash = props.ownerPasswordHash();
		if (email.isEmpty() || hash.isEmpty()) {
			if (owners.findAllActive().isEmpty()) {
				log.warn("OWNER_EMAIL and OWNER_PASSWORD_HASH are not set and no owner exists: every login will fail. "
						+ "Set both (hash from ./gradlew -q hashPassword) and restart.");
			} else {
				log.info("OWNER_EMAIL / OWNER_PASSWORD_HASH not set; keeping the existing owner unchanged.");
			}
			return;
		}
		if (!BCRYPT.matcher(hash).matches()) {
			throw new IllegalStateException("OWNER_PASSWORD_HASH is not a bcrypt hash; generate it with ./gradlew -q hashPassword");
		}

		// Ink has exactly one owner: a changed OWNER_EMAIL renames that owner, it never adds a second one.
		List<Owner> live = owners.findAllActive();
		if (live.size() > 1) {
			throw new IllegalStateException("More than one live owner exists; Ink supports a single owner. "
					+ "Soft-delete the extra rows (owner.deleted_at) and restart.");
		}
		if (live.isEmpty()) {
			owners.save(new Owner(email, hash, clock.instant()));
			log.info("Created the owner account from OWNER_EMAIL.");
			return;
		}
		Owner owner = live.get(0);
		boolean emailChanged = !owner.getEmail().equalsIgnoreCase(email);
		boolean hashChanged = !owner.getPasswordHash().equals(hash);
		if (emailChanged) {
			owner.changeEmail(email, clock.instant());
		}
		if (hashChanged) {
			owner.changePasswordHash(hash, clock.instant());
		}
		if (emailChanged || hashChanged) {
			owners.flush();
			int revoked = tokens.revokeAll(owner.getId());
			log.info("Owner {} changed from env; revoked {} session(s).",
					emailChanged && hashChanged ? "email and password" : emailChanged ? "email" : "password", revoked);
		}
	}

}
