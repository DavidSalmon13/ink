package app.ink.api.common;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * The one error format (AC5): {@code {"error": {"code", "message", "details"?}}}. {@code code} is a
 * stable snake_case string the app can switch on; {@code message} is a fixed, human-readable string
 * that never contains request values or internals; {@code details} is omitted when there are none.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(String code, String message, Map<String, Object> details) {

	public ApiError(String code, String message) {
		this(code, message, null);
	}

	/** The response body: this error wrapped under {@code "error"}. */
	public Map<String, ApiError> body() {
		return Map.of("error", this);
	}

}
