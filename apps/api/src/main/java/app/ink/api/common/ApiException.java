package app.ink.api.common;

import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * An error the API reports on purpose, with its HTTP status and stable snake_case code (AC5).
 * {@code GlobalExceptionHandler} turns it into {@code {"error": {"code", "message", "details"?}}}.
 * Messages are fixed strings: never put request values or internals in them.
 */
public class ApiException extends RuntimeException {

	private final HttpStatus status;
	private final String code;
	private final transient Map<String, Object> details;

	public ApiException(HttpStatus status, String code, String message) {
		this(status, code, message, null);
	}

	public ApiException(HttpStatus status, String code, String message, Map<String, Object> details) {
		super(message, null, false, false);
		this.status = status;
		this.code = code;
		this.details = details;
	}

	public HttpStatus status() {
		return status;
	}

	public String code() {
		return code;
	}

	public Map<String, Object> details() {
		return details;
	}

	/** 404 {@code not_found}: the record doesn't exist or is soft-deleted. */
	public static class NotFound extends ApiException {
		public NotFound() {
			super(HttpStatus.NOT_FOUND, "not_found", "Not found");
		}
	}

	/** 409 {@code version_conflict}, with the current record in {@code details.current} (AC3). */
	public static class VersionConflict extends ApiException {
		public VersionConflict(Object current) {
			super(HttpStatus.CONFLICT, "version_conflict", "The record was changed on another device",
					current == null ? null : Map.of("current", current));
		}
	}

}
