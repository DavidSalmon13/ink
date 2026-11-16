// covers AC3, T9
package app.ink.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class HashPasswordCliTest {

    private final ByteArrayOutputStream out = new ByteArrayOutputStream();
    private final ByteArrayOutputStream err = new ByteArrayOutputStream();

    private int run(String password) {
        return HashPasswordCli.run(password, new PrintStream(out, true, StandardCharsets.UTF_8),
                new PrintStream(err, true, StandardCharsets.UTF_8));
    }

    @Test
    void printsACost12BcryptHashOfThePassword() {
        assertThat(run("correct-horse-battery")).isZero();

        String hash = out.toString(StandardCharsets.UTF_8).trim();
        assertThat(hash).startsWith("$2a$12$");
        assertThat(new BCryptPasswordEncoder().matches("correct-horse-battery", hash)).isTrue();
        assertThat(hash).doesNotContain("correct-horse-battery");
    }

    @Test
    void emptyOrMissingInputFails() {
        assertThat(run("")).isEqualTo(1);
        assertThat(run(null)).isEqualTo(1);
        assertThat(out.toString(StandardCharsets.UTF_8)).isEmpty();
    }

    @Test
    void passwordOverBcrypts72BytesIsRefused() {
        assertThat(run("א".repeat(37))).isEqualTo(1); // 74 UTF-8 bytes
        assertThat(err.toString(StandardCharsets.UTF_8)).contains("72 bytes");
        assertThat(out.toString(StandardCharsets.UTF_8)).isEmpty();
    }
}
