package app.ink.api.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Dev CORS for the API's own MVC endpoints (future controllers). Origins come from
 * {@code app.cors.allowed-origins} (default the Expo web dev server). The actuator
 * {@code /health} endpoint is covered separately by
 * {@code management.endpoints.web.cors.*} in application.yml. deploy-pipeline sets
 * the production origin.
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
