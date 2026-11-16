package app.ink.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues, checks and revokes opaque per-device session tokens. A token is 32 random bytes
 * (base64url); only its SHA-256 hash is stored, so a database leak can't be replayed. A fast hash
 * is enough because the token has 256 bits of entropy (unlike a password).
 */
@Service
public class SessionTokenService {

	private static final int TOKEN_BYTES = 32;

	private final OwnerSessionRepository sessions;
	private final AuthProperties props;
	private final Clock clock;
	private final SecureRandom random = new SecureRandom();

	public SessionTokenService(OwnerSessionRepository sessions, AuthProperties props, Clock clock) {
		this.sessions = sessions;
		this.props = props;
		this.clock = clock;
	}

	/** A new session; {@code token} is returned to the device once and never stored. */
	public record IssuedSession(String token, OwnerSession session) {
	}

	@Transactional
	public IssuedSession issue(UUID ownerId, String deviceName, String platform) {
		byte[] bytes = new byte[TOKEN_BYTES];
		random.nextBytes(bytes);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		OwnerSession session = sessions.save(new OwnerSession(ownerId, hash(token), deviceName, platform, clock.instant()));
		return new IssuedSession(token, session);
	}

	/**
	 * The live session for this token, or empty when it's unknown, revoked or expired. Extends the
	 * sliding expiry, writing last_used_at at most once per touch interval.
	 */
	@Transactional
	public Optional<OwnerSession> authenticate(String token) {
		if (token == null || token.isBlank()) {
			return Optional.empty();
		}
		Instant now = clock.instant();
		Optional<OwnerSession> found = sessions.findActiveByTokenHash(hash(token), now.minus(props.sessionTtl()));
		found.filter(s -> s.getLastUsedAt().isBefore(now.minus(props.touchInterval())))
				.ifPresent(s -> s.touch(now));
		return found;
	}

	@Transactional(readOnly = true)
	public List<OwnerSession> listActive(UUID ownerId) {
		return sessions.findActiveByOwner(ownerId, clock.instant().minus(props.sessionTtl()));
	}

	/** Revokes one of the owner's live sessions. False when there is no such live session for this owner. */
	@Transactional
	public boolean revoke(UUID ownerId, UUID sessionId) {
		Optional<OwnerSession> session = sessions.findById(sessionId)
				.filter(s -> s.getOwnerId().equals(ownerId) && s.getDeletedAt() == null);
		session.ifPresent(s -> s.revoke(clock.instant()));
		return session.isPresent();
	}

	/** Revokes every live session of the owner (password change). */
	@Transactional
	public int revokeAll(UUID ownerId) {
		return sessions.revokeAllForOwner(ownerId, clock.instant());
	}

	/** Lowercase hex SHA-256 of the token, as stored in owner_session.token_hash. */
	static String hash(String token) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 is always available", e);
		}
	}

}
