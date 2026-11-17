package app.ink.api.auth;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import app.ink.api.common.ApiError;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Writes the shared {@link ApiError} body from servlet filters (the security entry point), where
 * {@code GlobalExceptionHandler} can't reach.
 */
@Component
public class ApiErrorWriter {

	private final ObjectMapper mapper;

	public ApiErrorWriter(ObjectMapper mapper) {
		this.mapper = mapper;
	}

	public void write(HttpServletResponse response, int status, String code, String message) throws IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		mapper.writeValue(response.getOutputStream(), new ApiError(code, message).body());
	}

}
