package app.ink.api.auth;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * JSON errors for {@link AuthController}, in the same {@code {"error": {"code", "message"}}} shape
 * as {@link ApiErrorWriter}. api-conventions owns the final shared error format and will replace
 * this. Messages are fixed strings: never echo request values (they may hold a password).
 */
@RestControllerAdvice(assignableTypes = AuthController.class)
class AuthExceptionHandler {

	@ExceptionHandler(LoginService.InvalidCredentialsException.class)
	ResponseEntity<Map<String, Object>> invalidCredentials() {
		return error(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Invalid email or password");
	}

	@ExceptionHandler({ MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
			MethodArgumentTypeMismatchException.class })
	ResponseEntity<Map<String, Object>> badRequest() {
		return error(HttpStatus.BAD_REQUEST, "bad_request", "Invalid request");
	}

	private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
		return ResponseEntity.status(status).body(ApiErrorWriter.body(code, message));
	}

}
