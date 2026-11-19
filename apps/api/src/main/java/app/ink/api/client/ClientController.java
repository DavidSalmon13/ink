package app.ink.api.client;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import java.lang.annotation.Retention;
import java.lang.annotation.Target;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.ink.api.common.VersionedWrites;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Clients (client-list): {@code PUT /clients/{id}} creates or updates under the versioned-write rules
 * (AC1, AC3), {@code GET /clients/{id}} reads one (AC4), and {@code GET /clients?q=} lists the live
 * clients, optionally narrowed by a server-side search (AC4, AC5). {@code DELETE /clients/{id}} soft-deletes
 * one and {@code GET /clients/{id}/summary} returns the card's summary (client-card AC4, AC7).
 */
@RestController
@RequestMapping("/clients")
class ClientController {

	/**
	 * The payload, cleaned before validation (AC2): name trimmed, blank optional fields → null, the
	 * Instagram handle lowercased and without its leading {@code @} (so {@code @Maya.Lines} is saved as
	 * {@code maya.lines}).
	 */
	record ClientInput(
			Long version,
			@NotBlank @Size(max = 100) String name,
			@PhoneNumber String phone,
			@Email String email,
			@Pattern(regexp = "[a-z0-9._]{1,30}") String instagram,
			@Size(max = 2000) String notes) {

		ClientInput {
			name = name == null ? null : name.strip();
			phone = blankToNull(phone);
			email = blankToNull(email);
			instagram = ClientSearch.instagram(instagram);
			notes = notes == null || notes.isBlank() ? null : notes;
		}

		private static String blankToNull(String s) {
			return s == null || s.isBlank() ? null : s.strip();
		}
	}

	/** {@code tattooCount} is 0 until the Completed tattoos epic computes it (same contract). */
	record ClientView(UUID id, long version, Instant createdAt, Instant updatedAt, String name, String phone,
			String email, String instagram, String notes, int tattooCount) {
	}

	/** 9–15 digits once normalized ({@link ClientSearch#phoneDigits}); null passes. */
	@Target({ FIELD, PARAMETER })
	@Retention(RUNTIME)
	@Constraint(validatedBy = PhoneNumberValidator.class)
	@interface PhoneNumber {
		String message() default "must have 9 to 15 digits";

		Class<?>[] groups() default {};

		Class<? extends Payload>[] payload() default {};
	}

	static class PhoneNumberValidator implements ConstraintValidator<PhoneNumber, String> {
		@Override
		public boolean isValid(String value, ConstraintValidatorContext context) {
			if (value == null) {
				return true;
			}
			String digits = ClientSearch.phoneDigits(value);
			return digits != null && digits.length() >= 9 && digits.length() <= 15;
		}
	}

	private final VersionedWrites writes;
	private final ClientRepository clients;
	private final ClientSummaryService summaries;

	ClientController(VersionedWrites writes, ClientRepository clients, ClientSummaryService summaries) {
		this.writes = writes;
		this.clients = clients;
		this.summaries = summaries;
	}

	@PutMapping("/{id}")
	ClientView put(@PathVariable UUID id, @Valid @RequestBody ClientInput in) {
		return writes.put(Client.class, id, in.version(), in,
				p -> new Client(id, p.name(), p.phone(), p.email(), p.instagram(), p.notes()),
				(c, p) -> c.sameAs(p.name(), p.phone(), p.email(), p.instagram(), p.notes()),
				(c, p) -> c.set(p.name(), p.phone(), p.email(), p.instagram(), p.notes()),
				ClientController::view);
	}

	@GetMapping("/{id}")
	ClientView get(@PathVariable UUID id) {
		return writes.get(Client.class, id, ClientController::view);
	}

	/** The card's summary (client-card AC4): zeros until the later epics; unknown or deleted → 404. */
	@GetMapping("/{id}/summary")
	ClientSummary summary(@PathVariable UUID id) {
		return summaries.summarize(id);
	}

	/** Soft delete (client-card AC7): the row stays with {@code deleted_at}; repeats and unknown ids are 204. */
	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable UUID id) {
		writes.softDelete(Client.class, id);
	}

	@GetMapping
	@Transactional(readOnly = true)
	List<ClientView> list(@RequestParam(required = false) String q) {
		String name = ClientSearch.name(q);
		List<Client> found = name.isEmpty() ? clients.findLive()
				: clients.search(contains(name), contains(ClientSearch.instagram(q)),
						contains(ClientSearch.phoneQuery(q)));
		return found.stream().map(ClientController::view).toList();
	}

	/** A LIKE pattern for a substring, or "" (matches nothing here) when there's nothing to match. */
	private static String contains(String normalized) {
		if (normalized == null || normalized.isEmpty()) {
			return "";
		}
		String escaped = normalized.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
		return "%" + escaped + "%";
	}

	private static ClientView view(Client c) {
		return new ClientView(c.getId(), c.getVersion(), c.getCreatedAt(), c.getUpdatedAt(), c.getName(),
				c.getPhone(), c.getEmail(), c.getInstagram(), c.getNotes(), 0);
	}

}
