package app.ink.api.auth;

import java.io.BufferedReader;
import java.io.Console;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Prints the bcrypt hash of a password read from stdin, for OWNER_PASSWORD_HASH. The password is
 * never taken from arguments, so it stays out of shell history. Run through Gradle:
 *
 * <pre>./gradlew -q hashPassword</pre>
 *
 * then type the password and press Enter (or pipe it in). No Spring context is started.
 */
public final class HashPasswordCli {

	private HashPasswordCli() {
	}

	public static void main(String[] args) throws IOException {
		String password = readPassword();
		if (password == null || password.isEmpty()) {
			System.err.println("No password given on stdin.");
			System.exit(1);
		}
		System.out.println(new BCryptPasswordEncoder(AuthConfig.BCRYPT_STRENGTH).encode(password));
	}

	private static String readPassword() throws IOException {
		Console console = System.console();
		if (console != null) {
			char[] chars = console.readPassword("Password: ");
			return chars == null ? null : new String(chars);
		}
		System.err.println("Password (then Enter):");
		BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
		return in.readLine();
	}

}
