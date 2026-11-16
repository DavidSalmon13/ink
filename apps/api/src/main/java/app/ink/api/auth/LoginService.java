package app.ink.api.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Checks the owner's email and password and issues a device session. A wrong email and a wrong
 * password fail identically, including the time spent: an unknown email still runs one bcrypt
 * check against a dummy hash of the same cost as the configured owner hash. Brute force is capped
 * by {@link LoginRateLimiter}.
 */
@Service
public class LoginService {

	/** bcrypt only reads the first 72 bytes; a longer password can't be the owner's (HashPasswordCli refuses it). */
	static final int MAX_PASSWORD_BYTES = 72;

	/** Wrong email or password (AC5: one answer for both, no account enumeration). */
	public static class InvalidCredentialsException extends RuntimeException {
		InvalidCredentialsException() {
			super(null, null, false, false);
		}
	}

	/** Too many recent failures for this email or client IP. */
	public static class TooManyAttemptsException extends RuntimeException {
		TooManyAttemptsException() {
			super(null, null, false, false);
		}
	}

	private final OwnerRepository owners;
	private final SessionTokenService tokens;
	private final PasswordEncoder passwords;
	private final LoginRateLimiter limiter;
	private final String dummyHash;

	public LoginService(OwnerRepository owners, SessionTokenService tokens, PasswordEncoder passwords,
			LoginRateLimiter limiter, AuthProperties props) {
		this.owners = owners;
		this.tokens = tokens;
		this.passwords = passwords;
		this.limiter = limiter;
		this.dummyHash = new BCryptPasswordEncoder(bcryptCost(props.ownerPasswordHash()))
				.encode("timing-equalizer-not-a-password");
	}

	public SessionTokenService.IssuedSession login(String email, String password, String deviceName, String platform,
			String clientIp) {
		String emailKey = email.trim().toLowerCase(Locale.ROOT);
		LoginRateLimiter.Attempt attempt = limiter.tryAcquire(emailKey, clientIp)
				.orElseThrow(TooManyAttemptsException::new);

		Optional<Owner> owner = owners.findActiveByEmail(emailKey);
		boolean tooLong = password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES;
		String candidate = tooLong ? "" : password;
		boolean ok = passwords.matches(candidate, owner.map(Owner::getPasswordHash).orElse(dummyHash))
				&& owner.isPresent() && !tooLong;
		if (!ok) {
			attempt.failed();
			throw new InvalidCredentialsException();
		}
		attempt.succeeded();
		return tokens.issue(owner.get().getId(), deviceName.trim(), platform.trim());
	}

	/** The cost of a configured bcrypt hash ("$2a$12$..." → 12), or the default when none is set. */
	static int bcryptCost(String hash) {
		if (hash != null && hash.length() > 7 && hash.charAt(0) == '$' && hash.charAt(6) == '$') {
			try {
				int cost = Integer.parseInt(hash.substring(4, 6));
				if (cost >= 4 && cost <= 31) {
					return cost;
				}
			} catch (NumberFormatException ignored) {
				// fall through to the default
			}
		}
		return AuthConfig.BCRYPT_STRENGTH;
	}

}
