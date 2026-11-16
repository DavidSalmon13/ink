package app.ink.api.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.cors.CorsUtils;

/**
 * Stateless API security: an opaque per-device session token in {@code Authorization: Bearer}.
 * No HTTP sessions and no cookies (so no CSRF), no form or basic login. Public: {@code GET /health},
 * {@code POST /auth/login} and CORS preflight requests. Everything else, including unknown routes, answers
 * a JSON 401 without a valid token.
 */
@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, SessionTokenService tokens, ApiErrorWriter errors)
			throws Exception {
		AuthenticationEntryPoint unauthorized = (request, response, ex) -> errors.write(response,
				HttpStatus.UNAUTHORIZED.value(), "unauthorized", "Authentication required");

		return http
				// Uses the Spring MVC CORS mappings from CorsConfig.
				.cors(Customizer.withDefaults())
				.csrf(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.logout(AbstractHttpConfigurer::disable)
				.requestCache(AbstractHttpConfigurer::disable)
				.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.addFilterBefore(new BearerTokenFilter(tokens), AnonymousAuthenticationFilter.class)
				.exceptionHandling(e -> e
						.authenticationEntryPoint(unauthorized)
						.accessDeniedHandler((request, response, ex) -> unauthorized.commence(request, response, null)))
				.authorizeHttpRequests(auth -> auth
						// Only real CORS preflights; other OPTIONS calls need a token like any route.
						.requestMatchers(CorsUtils::isPreFlightRequest).permitAll()
						.requestMatchers(HttpMethod.GET, "/health").permitAll()
						.requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
						// Spring's error page must not turn a 401/404 into something else.
						.requestMatchers("/error").permitAll()
						.anyRequest().authenticated())
				.build();
	}

}
