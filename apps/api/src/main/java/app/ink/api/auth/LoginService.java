package app.ink.api.auth;

import java.util.Locale;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Checks the owner's email and password and issues a device session. A wrong email and a wrong
 * password fail identically, including the time spent: an unknown email still runs one bcrypt
 * check against a dummy hash. Brute force is capped by {@link LoginRateLimiter}.
 */
@Service
public class LoginService {

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

	public LoginService(OwnerRepository owners, SessionTokenService tokens, PasswordEncoder passwords, LoginRateLimiter limiter) {
		this.owners = owners;
		this.tokens = tokens;
		this.passwords = passwords;
		this.limiter = limiter;
		this.dummyHash = passwords.encode("timing-equalizer-not-a-password");
	}

	public SessionTokenService.IssuedSession login(String email, String password, String deviceName, String platform,
			String clientIp) {
		String emailKey = email.trim().toLowerCase(Locale.ROOT);
		if (limiter.isBlocked(emailKey, clientIp)) {
			throw new TooManyAttemptsException();
		}
		Optional<Owner> owner = owners.findActiveByEmail(emailKey);
		boolean ok = passwords.matches(password, owner.map(Owner::getPasswordHash).orElse(dummyHash)) && owner.isPresent();
		if (!ok) {
			limiter.recordFailure(emailKey, clientIp);
			throw new InvalidCredentialsException();
		}
		return tokens.issue(owner.get().getId(), deviceName.trim(), platform.trim());
	}

}
