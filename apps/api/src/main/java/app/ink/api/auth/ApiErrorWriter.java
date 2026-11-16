package app.ink.api.auth;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Writes {@code {"error": {"code", "message"}}} from servlet filters. api-conventions owns the
 * final shared error format and will align this.
 */
@Component
public class ApiErrorWriter {

	private final ObjectMapper mapper;

	public ApiErrorWriter(ObjectMapper mapper) {
		this.mapper = mapper;
	}

	public static Map<String, Object> body(String code, String message) {
		return Map.of("error", Map.of("code", code, "message", message));
	}

	public void write(HttpServletResponse response, int status, String code, String message) throws IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		mapper.writeValue(response.getOutputStream(), body(code, message));
	}

}
