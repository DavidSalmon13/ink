package app.ink.api.auth;

import java.time.Clock;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class AuthConfig {

	/** bcrypt cost for owner passwords, shared with {@link HashPasswordCli}. */
	static final int BCRYPT_STRENGTH = 12;

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

	/** Owner passwords. matches() accepts a hash of any bcrypt cost. */
	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
	}

}
