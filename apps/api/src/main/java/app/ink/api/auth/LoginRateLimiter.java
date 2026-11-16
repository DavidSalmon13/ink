package app.ink.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Login brute-force cap: 5 failed attempts within 15 minutes for one email (lowercased), or from one
 * client IP, blocks further logins for that email or IP for 15 minutes, even with the correct
 * password. Successful logins don't count. In memory, which is enough for the single API instance
 * (distributed limiting is out of scope).
 *
 * <p>An attempt is reserved <em>before</em> the slow password check ({@link #tryAcquire}), so a burst
 * of parallel requests can't run more than 5 guesses: in-flight attempts count toward the cap. The
 * caller then reports {@link Attempt#failed()} or {@link Attempt#succeeded()}.
 */
@Component
public class LoginRateLimiter {

	static final int MAX_FAILURES = 5;
	static final Duration WINDOW = Duration.ofMinutes(15);
	static final Duration BLOCK = Duration.ofMinutes(15);
	/** Above this many tracked keys, stale entries are swept on the next attempt. */
	private static final int SWEEP_THRESHOLD = 10_000;

	/** Failed and in-flight attempts for one key (an email or an IP). Guarded by its own monitor. */
	private static final class Window {
		final Deque<Instant> attempts = new ArrayDeque<>();
		Instant blockedUntil;

		void prune(Instant now) {
			Instant cutoff = now.minus(WINDOW);
			while (!attempts.isEmpty() && !attempts.peekFirst().isAfter(cutoff)) {
				attempts.pollFirst();
			}
		}

		boolean blocked(Instant now) {
			return blockedUntil != null && now.isBefore(blockedUntil);
		}

		boolean stale(Instant now) {
			prune(now);
			return attempts.isEmpty() && !blocked(now);
		}
	}

	/** One reserved login attempt; report its outcome exactly once. */
	public final class Attempt {
		private final String[] keys;
		private final Instant at;

		private Attempt(String[] keys, Instant at) {
			this.keys = keys;
			this.at = at;
		}

		/** Wrong credentials: the attempt stays counted, and the 5th failure starts the block. */
		public void failed() {
			Instant now = clock.instant();
			for (String key : keys) {
				Window w = windows.get(key);
				if (w != null) {
					synchronized (w) {
						w.prune(now);
						if (w.attempts.size() >= MAX_FAILURES) {
							w.blockedUntil = now.plus(BLOCK);
							w.attempts.clear();
						}
					}
				}
			}
		}

		/** Correct credentials: the attempt is released and doesn't count as a failure. */
		public void succeeded() {
			for (String key : keys) {
				Window w = windows.get(key);
				if (w != null) {
					synchronized (w) {
						w.attempts.removeFirstOccurrence(at);
					}
				}
			}
		}
	}

	private final Map<String, Window> windows = new ConcurrentHashMap<>();
	private final Clock clock;

	public LoginRateLimiter(Clock clock) {
		this.clock = clock;
	}

	/**
	 * Reserves an attempt for this email (already lowercased) and IP, or returns empty when either is
	 * blocked or already has 5 failed or in-flight attempts in the window.
	 */
	public Optional<Attempt> tryAcquire(String email, String clientIp) {
		Instant now = clock.instant();
		sweepIfLarge(now);
		String emailKey = "email:" + email;
		String ipKey = "ip:" + (clientIp == null ? "unknown" : clientIp);
		if (!reserve(emailKey, now)) {
			return Optional.empty();
		}
		if (!reserve(ipKey, now)) {
			release(emailKey, now);
			return Optional.empty();
		}
		return Optional.of(new Attempt(new String[] { emailKey, ipKey }, now));
	}

	private boolean reserve(String key, Instant now) {
		Window w = windows.computeIfAbsent(key, k -> new Window());
		synchronized (w) {
			w.prune(now);
			if (w.blocked(now) || w.attempts.size() >= MAX_FAILURES) {
				return false;
			}
			w.attempts.addLast(now);
			return true;
		}
	}

	private void release(String key, Instant at) {
		Window w = windows.get(key);
		if (w != null) {
			synchronized (w) {
				w.attempts.removeFirstOccurrence(at);
			}
		}
	}

	private void sweepIfLarge(Instant now) {
		if (windows.size() > SWEEP_THRESHOLD) {
			windows.entrySet().removeIf(e -> {
				synchronized (e.getValue()) {
					return e.getValue().stale(now);
				}
			});
		}
	}

}
