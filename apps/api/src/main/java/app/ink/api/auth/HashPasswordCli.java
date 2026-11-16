package app.ink.api.auth;

import java.io.BufferedReader;
import java.io.Console;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
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
		Console console = System.console();
		String password;
		if (console != null) {
			char[] chars = console.readPassword("Password: ");
			password = chars == null ? null : new String(chars);
		} else {
			System.err.println("Password (then Enter):");
			password = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8)).readLine();
		}
		System.exit(run(password, System.out, System.err));
	}

	/** Prints the hash of {@code password} and returns 0, or explains the problem and returns 1. */
	static int run(String password, PrintStream out, PrintStream err) {
		if (password == null || password.isEmpty()) {
			err.println("No password given on stdin.");
			return 1;
		}
		if (password.getBytes(StandardCharsets.UTF_8).length > LoginService.MAX_PASSWORD_BYTES) {
			err.println("Password is longer than " + LoginService.MAX_PASSWORD_BYTES + " bytes; bcrypt would ignore the rest.");
			return 1;
		}
		out.println(new BCryptPasswordEncoder(AuthConfig.BCRYPT_STRENGTH).encode(password));
		return 0;
	}

}
