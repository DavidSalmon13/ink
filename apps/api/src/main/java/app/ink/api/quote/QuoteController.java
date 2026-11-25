package app.ink.api.quote;

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

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Quotes (save-quote): {@code PUT /quotes/{id}} creates or updates one under the versioned-write rules, with
 * the server recomputing every price from the seeded Settings row (AC3); {@code GET /quotes?clientId=} lists a
 * client's live quotes newest-first and {@code GET /quotes/{id}} reads one (AC4); {@code DELETE /quotes/{id}}
 * soft-deletes it idempotently (AC4). Mirrors {@code ClientController}: {@link QuoteService} holds the recompute.
 */
@RestController
@RequestMapping("/quotes")
class QuoteController {

	/**
	 * One tattoo of the visit, with a device-generated {@code id} and its {@code position} in the list. The
	 * client-sent minutes are not accepted here — the server recomputes {@code estimatedMinutes} — but an
	 * {@code estimatedMinutesOverride} (Aya's manual value) is honoured.
	 */
	record QuoteItemInput(
			@NotNull UUID id,
			@PositiveOrZero int position,
			@NotBlank @Size(max = 200) String description,
			@NotNull @Pattern(regexp = "XS|S|M|L|XL") String size,
			@NotNull @Pattern(regexp = "simple|medium|high") String detailLevel,
			@NotNull @Pattern(regexp = "none|light|full") String shading,
			@NotBlank String bodyPlacement,
			@NotNull @Pattern(regexp = "artist_sketch|client_reference|custom_design") String designSource,
			UUID sketchId,
			@PositiveOrZero Double designHours,
			@PositiveOrZero Integer estimatedMinutesOverride) {
	}

	/**
	 * The quote to save: the client it belongs to (required, and must be a live client), its title and notes,
	 * the visit-level options and the items. {@code version} is absent on create. Client-sent prices are not
	 * fields here — the server computes {@code computed}/{@code final}/{@code estimatedMinutesTotal}.
	 */
	record QuoteInput(
			Long version,
			@NotNull UUID clientId,
			@NotBlank @Size(max = 200) String title,
			@Size(max = 2000) String notes,
			@NotNull @Pattern(regexp = "none|percent|amount") String discountType,
			@PositiveOrZero long discountValue,
			@PositiveOrZero int extraNeedles,
			@PositiveOrZero Long priceOverrideAgorot,
			@NotEmpty @Valid List<QuoteItemInput> items) {

		QuoteInput {
			notes = notes == null || notes.isBlank() ? null : notes;
		}
	}

	record QuoteItemView(UUID id, int position, String description, String size, String detailLevel,
			String shading, String bodyPlacement, String designSource, UUID sketchId, Double designHours,
			int estimatedMinutes, Integer estimatedMinutesOverride) {
	}

	record QuoteView(UUID id, long version, Instant createdAt, Instant updatedAt, UUID clientId, String title,
			String notes, String discountType, long discountValue, int extraNeedles, Long priceOverrideAgorot,
			long computedPriceAgorot, long finalPriceAgorot, int estimatedMinutesTotal,
			List<QuoteItemView> items) {
	}

	private final QuoteService service;
	private final QuoteRepository quotes;

	QuoteController(QuoteService service, QuoteRepository quotes) {
		this.service = service;
		this.quotes = quotes;
	}

	@PutMapping("/{id}")
	QuoteView put(@PathVariable UUID id, @Valid @RequestBody QuoteInput in) {
		return service.save(id, in);
	}

	@GetMapping("/{id}")
	QuoteView get(@PathVariable UUID id) {
		return service.get(id);
	}

	@GetMapping
	@Transactional(readOnly = true)
	List<QuoteView> list(@RequestParam UUID clientId) {
		return quotes.findLiveByClientId(clientId).stream().map(QuoteService::view).toList();
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@PathVariable UUID id) {
		service.delete(id);
	}

}
