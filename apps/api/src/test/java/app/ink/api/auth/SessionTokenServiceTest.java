// covers AC4, AC7, AC9, T1, T5
package app.ink.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SessionTokenServiceTest {

	private static final Instant NOW = Instant.parse("2026-11-16T10:00:00Z");
	private static final UUID OWNER = UUID.randomUUID();

	private OwnerSessionRepository repo;
	private SessionTokenService service;

	@BeforeEach
	void setUp() {
		repo = mock(OwnerSessionRepository.class);
		when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
		AuthProperties props = new AuthProperties("", "", Duration.ofDays(90), Duration.ofHours(1));
		service = new SessionTokenService(repo, props, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void issuesA32ByteBase64UrlTokenAndStoresOnlyItsHash() {
		SessionTokenService.IssuedSession issued = service.issue(OWNER, "iPhone", "ios");

		assertThat(issued.token()).matches("^[A-Za-z0-9_-]{43}$");
		verify(repo).save(any(OwnerSession.class));
		assertThat(issued.session().getLastUsedAt()).isEqualTo(NOW);
	}

	@Test
	void tokensAreUnique() {
		assertThat(service.issue(OWNER, "a", "ios").token()).isNotEqualTo(service.issue(OWNER, "b", "ios").token());
	}

	@Test
	void hashIsLowercaseHexSha256() {
		// sha256("abc")
		assertThat(SessionTokenService.hash("abc"))
				.isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
	}

	@Test
	void lookupUsesTheHashAndThe90DayCutoff() {
		when(repo.findActiveByTokenHash(any(), any())).thenReturn(Optional.empty());

		assertThat(service.authenticate("tok")).isEmpty();
		verify(repo).findActiveByTokenHash(SessionTokenService.hash("tok"), NOW.minus(Duration.ofDays(90)));
	}

	@Test
	void blankTokenIsRejectedWithoutALookup() {
		assertThat(service.authenticate("  ")).isEmpty();
		assertThat(service.authenticate(null)).isEmpty();
	}

	@Test
	void touchesLastUsedAtOnlyWhenOlderThanTheInterval() {
		OwnerSession recent = new OwnerSession(OWNER, "h1", "d", "ios", NOW.minus(Duration.ofMinutes(59)));
		OwnerSession stale = new OwnerSession(OWNER, "h2", "d", "ios", NOW.minus(Duration.ofMinutes(61)));
		when(repo.findActiveByTokenHash(eq(SessionTokenService.hash("recent")), any())).thenReturn(Optional.of(recent));
		when(repo.findActiveByTokenHash(eq(SessionTokenService.hash("stale")), any())).thenReturn(Optional.of(stale));

		service.authenticate("recent");
		service.authenticate("stale");

		assertThat(recent.getLastUsedAt()).isEqualTo(NOW.minus(Duration.ofMinutes(59)));
		assertThat(stale.getLastUsedAt()).isEqualTo(NOW);
	}

	@Test
	void revokeOnlyAffectsTheOwnersLiveSession() {
		OwnerSession mine = new OwnerSession(OWNER, "h", "d", "ios", NOW);
		OwnerSession theirs = new OwnerSession(UUID.randomUUID(), "h2", "d", "ios", NOW);
		when(repo.findById(mine.getId())).thenReturn(Optional.of(mine));
		when(repo.findById(theirs.getId())).thenReturn(Optional.of(theirs));

		assertThat(service.revoke(OWNER, theirs.getId())).isFalse();
		assertThat(theirs.getDeletedAt()).isNull();
		assertThat(service.revoke(OWNER, mine.getId())).isTrue();
		assertThat(mine.getDeletedAt()).isEqualTo(NOW);
		assertThat(service.revoke(OWNER, mine.getId())).isFalse(); // already revoked
	}
}
