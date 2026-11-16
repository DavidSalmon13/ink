package app.ink.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Login brute-force cap: 5 failed attempts within 15 minutes for one email (lowercased), or from one
 * client IP, blocks further logins for that email or IP for 15 minutes, even with the correct
 * password. Successful logins don't count. In memory, which is enough for the single API instance
 * (distributed limiting is out of scope).
 */
@Component
public class LoginRateLimiter {

	static final int MAX_FAILURES = 5;
	static final Duration WINDOW = Duration.ofMinutes(15);
	static final Duration BLOCK = Duration.ofMinutes(15);
	/** Above this many tracked keys, stale entries are swept on the next failure. */
	private static final int SWEEP_THRESHOLD = 10_000;

	private static final class Attempts {
		final Deque<Instant> failures = new ArrayDeque<>();
		Instant blockedUntil;

		boolean blocked(Instant now) {
			return blockedUntil != null && now.isBefore(blockedUntil);
		}

		boolean stale(Instant now) {
			prune(now);
			return failures.isEmpty() && !blocked(now);
		}

		void prune(Instant now) {
			Instant cutoff = now.minus(WINDOW);
			while (!failures.isEmpty() && !failures.peekFirst().isAfter(cutoff)) {
				failures.pollFirst();
			}
		}
	}

	private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();
	private final Clock clock;

	public LoginRateLimiter(Clock clock) {
		this.clock = clock;
	}

	/** True when this email or this IP is currently blocked. {@code email} must already be lowercased. */
	public boolean isBlocked(String email, String clientIp) {
		Instant now = clock.instant();
		return blocked(emailKey(email), now) || blocked(ipKey(clientIp), now);
	}

	/** Counts one failed login against both the email and the IP. */
	public void recordFailure(String email, String clientIp) {
		Instant now = clock.instant();
		if (attempts.size() > SWEEP_THRESHOLD) {
			attempts.entrySet().removeIf(e -> {
				synchronized (e.getValue()) {
					return e.getValue().stale(now);
				}
			});
		}
		fail(emailKey(email), now);
		fail(ipKey(clientIp), now);
	}

	private boolean blocked(String key, Instant now) {
		Attempts a = attempts.get(key);
		if (a == null) {
			return false;
		}
		synchronized (a) {
			return a.blocked(now);
		}
	}

	private void fail(String key, Instant now) {
		attempts.compute(key, (k, a) -> {
			Attempts current = a == null ? new Attempts() : a;
			synchronized (current) {
				current.prune(now);
				current.failures.addLast(now);
				if (current.failures.size() >= MAX_FAILURES) {
					current.blockedUntil = now.plus(BLOCK);
					current.failures.clear();
				}
			}
			return current;
		});
	}

	private static String emailKey(String email) {
		return "email:" + email;
	}

	private static String ipKey(String clientIp) {
		return "ip:" + (clientIp == null ? "unknown" : clientIp);
	}

}
