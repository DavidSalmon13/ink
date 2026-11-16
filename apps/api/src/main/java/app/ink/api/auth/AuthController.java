package app.ink.api.auth;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Owner login and device sessions. {@code POST /auth/login} is public; the rest need a Bearer
 * token (SecurityConfig). Errors come from {@link AuthExceptionHandler}.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

	public record LoginRequest(
			@NotBlank @Size(max = 320) String email,
			@NotBlank @Size(max = 1024) String password,
			@NotBlank @Size(max = 100) String deviceName,
			@NotBlank @Size(max = 20) String platform) {

		/** Keeps the password out of any log line or error message that prints the request. */
		@Override
		public String toString() {
			return "LoginRequest[email=" + email + ", deviceName=" + deviceName + ", platform=" + platform + "]";
		}
	}

	public record LoginResponse(String token, UUID sessionId) {
	}

	public record SessionView(UUID id, String deviceName, String platform, Instant createdAt, Instant lastUsedAt,
			boolean current) {
	}

	private final LoginService login;
	private final SessionTokenService tokens;

	public AuthController(LoginService login, SessionTokenService tokens) {
		this.login = login;
		this.tokens = tokens;
	}

	@PostMapping("/login")
	public LoginResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
		SessionTokenService.IssuedSession issued = login.login(body.email(), body.password(), body.deviceName(),
				body.platform(), request.getRemoteAddr());
		return new LoginResponse(issued.token(), issued.session().getId());
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@AuthenticationPrincipal OwnerPrincipal me) {
		tokens.revoke(me.ownerId(), me.sessionId());
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/sessions")
	public List<SessionView> sessions(@AuthenticationPrincipal OwnerPrincipal me) {
		return tokens.listActive(me.ownerId()).stream()
				.map(s -> new SessionView(s.getId(), s.getDeviceName(), s.getPlatform(), s.getCreatedAt(),
						s.getLastUsedAt(), s.getId().equals(me.sessionId())))
				.toList();
	}

	/** Revokes one of the caller's own sessions; any other id (or an already revoked one) is 404. */
	@DeleteMapping("/sessions/{id}")
	public ResponseEntity<Void> revoke(@AuthenticationPrincipal OwnerPrincipal me, @PathVariable UUID id) {
		if (!tokens.revoke(me.ownerId(), id)) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
		}
		return ResponseEntity.noContent().build();
	}

}
