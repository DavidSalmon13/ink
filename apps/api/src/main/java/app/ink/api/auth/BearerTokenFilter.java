package app.ink.api.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Reads {@code Authorization: Bearer <token>} and, when it maps to a live session, authenticates
 * the request as that owner. Missing, malformed, unknown, revoked and expired tokens all leave the
 * request anonymous, so protected endpoints answer the same 401 for each (no hints). Never logs
 * the token.
 */
public class BearerTokenFilter extends OncePerRequestFilter {

	private static final String PREFIX = "bearer ";

	private final SessionTokenService tokens;

	public BearerTokenFilter(SessionTokenService tokens) {
		this.tokens = tokens;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header != null && header.length() > PREFIX.length() && header.regionMatches(true, 0, PREFIX, 0, PREFIX.length())) {
			String token = header.substring(PREFIX.length()).trim();
			tokens.authenticate(token).ifPresent(session -> {
				OwnerPrincipal principal = new OwnerPrincipal(session.getOwnerId(), session.getId());
				SecurityContextHolder.getContext()
						.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
			});
		}
		chain.doFilter(request, response);
	}

}
