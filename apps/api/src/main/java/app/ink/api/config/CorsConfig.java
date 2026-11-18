package app.ink.api.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS for the API's own MVC endpoints, applied through Spring Security's {@code .cors()}.
 * Origins come from {@code app.cors.allowed-origins}: the Expo web dev server by default, and
 * in production the web preview's origin from the {@code APP_CORS_ALLOWED_ORIGINS} variable
 * (comma-separated), which replaces the default. The actuator {@code /health} endpoint reads
 * the same property through {@code management.endpoints.web.cors.*} in application.yml.
 * Tested by CorsConfigIT.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

	private final List<String> allowedOrigins;

	public CorsConfig(@Value("${app.cors.allowed-origins:http://localhost:8081}") List<String> allowedOrigins) {
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/**")
				.allowedOrigins(allowedOrigins.toArray(String[]::new))
				.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
	}

}
