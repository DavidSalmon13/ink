package app.ink.api.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import app.ink.api.auth.AuthController;
import app.ink.api.auth.LoginService;

/**
 * Every error a controller produces leaves as {@link ApiError} (AC5). Messages are fixed strings and
 * never echo request values (login bodies hold a password) or exception text. Filter-level errors
 * (401) are written by {@code auth/ApiErrorWriter} in the same shape.
 */
@RestControllerAdvice
class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	ResponseEntity<Map<String, ApiError>> api(ApiException ex) {
		return error(ex.status(), new ApiError(ex.code(), ex.getMessage(), ex.details()));
	}

	/** Two devices saved the same version at the same moment: the loser gets a plain conflict. */
	@ExceptionHandler(ObjectOptimisticLockingFailureException.class)
	ResponseEntity<Map<String, ApiError>> concurrentWrite() {
		return error(HttpStatus.CONFLICT, "version_conflict", "The record was changed on another device");
	}

	// ---- auth (moved from owner-auth-lock's AuthExceptionHandler: same codes, same statuses) ----

	@ExceptionHandler(LoginService.InvalidCredentialsException.class)
	ResponseEntity<Map<String, ApiError>> invalidCredentials() {
		return error(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Invalid email or password");
	}

	@ExceptionHandler(LoginService.TooManyAttemptsException.class)
	ResponseEntity<Map<String, ApiError>> tooManyAttempts() {
		return error(HttpStatus.TOO_MANY_REQUESTS, "too_many_attempts", "Too many failed attempts, try again later");
	}

	// ---- request problems -----------------------------------------------------------------------

	/**
	 * Bean Validation failures: {@code validation_failed} with one message per field. Login keeps its
	 * original 400 {@code bad_request} (AC5: login's codes and statuses are unchanged for the app).
	 */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<Map<String, ApiError>> invalid(MethodArgumentNotValidException ex, HandlerMethod handler) {
		if (handler != null && AuthController.class.isAssignableFrom(handler.getBeanType())) {
			return badRequest();
		}
		Map<String, Object> fields = new LinkedHashMap<>();
		for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
			fields.putIfAbsent(fe.getField(), fe.getDefaultMessage());
		}
		return error(HttpStatus.BAD_REQUEST,
				new ApiError("validation_failed", "Some fields are invalid", Map.of("fields", fields)));
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
			MissingServletRequestParameterException.class })
	ResponseEntity<Map<String, ApiError>> badRequest() {
		return error(HttpStatus.BAD_REQUEST, "bad_request", "Invalid request");
	}

	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	ResponseEntity<Map<String, ApiError>> unsupportedMediaType() {
		return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type", "Unsupported content type");
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	ResponseEntity<Map<String, ApiError>> methodNotAllowed() {
		return error(HttpStatus.METHOD_NOT_ALLOWED, "bad_request", "Method not allowed");
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<Map<String, ApiError>> noRoute() {
		return error(HttpStatus.NOT_FOUND, "not_found", "Not found");
	}

	// ---- everything else ------------------------------------------------------------------------

	@ExceptionHandler(Exception.class)
	ResponseEntity<Map<String, ApiError>> unhandled(Exception ex) {
		log.error("Unhandled exception", ex);
		return error(HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "Something went wrong");
	}

	private static ResponseEntity<Map<String, ApiError>> error(HttpStatus status, String code, String message) {
		return error(status, new ApiError(code, message));
	}

	private static ResponseEntity<Map<String, ApiError>> error(HttpStatus status, ApiError error) {
		return ResponseEntity.status(status).body(error.body());
	}

}
