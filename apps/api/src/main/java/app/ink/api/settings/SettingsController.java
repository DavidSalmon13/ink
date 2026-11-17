package app.ink.api.settings;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import app.ink.api.common.ApiException;
import app.ink.api.common.VersionedWrites;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * {@code GET /settings} and {@code PUT /settings} (AC6). PUT follows the versioned-write rules (AC2,
 * AC3): send the full settings plus the {@code version} you last read.
 */
@RestController
@RequestMapping("/settings")
class SettingsController {

	/** The editable fields plus the expected version. Money is integer agorot, never negative. */
	record SettingsInput(
			@NotNull Long version,
			@NotNull @Min(0) Integer minimumPriceAgorot,
			@NotNull @Min(0) Integer minimumMinutes,
			@NotNull @Min(0) Integer hourlyRateAgorot,
			@NotNull @Min(0) Integer designHourlyRateAgorot,
			@NotNull @Min(0) Integer needleOpeningCostAgorot,
			@NotNull @Min(0) Integer extraNeedleCostAgorot,
			@NotNull Map<String, Object> estimateTables,
			@NotNull List<Object> calibrationPoints,
			@NotNull @Min(0) Integer autoLockSeconds,
			@NotBlank String timezone) {
	}

	record SettingsView(UUID id, long version, Instant createdAt, Instant updatedAt,
			int minimumPriceAgorot, int minimumMinutes, int hourlyRateAgorot, int designHourlyRateAgorot,
			int needleOpeningCostAgorot, int extraNeedleCostAgorot, Map<String, Object> estimateTables,
			List<Object> calibrationPoints, int autoLockSeconds, String timezone) {
	}

	private final SettingsRepository settings;
	private final VersionedWrites writes;

	SettingsController(SettingsRepository settings, VersionedWrites writes) {
		this.settings = settings;
		this.writes = writes;
	}

	@GetMapping
	SettingsView get() {
		return writes.get(Settings.class, rowId(), Settings::view);
	}

	@PutMapping
	SettingsView put(@Valid @RequestBody SettingsInput in) {
		return writes.update(Settings.class, rowId(), in.version(), in, Settings::sameAs, Settings::apply,
				Settings::view);
	}

	private UUID rowId() {
		return settings.findFirstByDeletedAtIsNull().map(Settings::getId).orElseThrow(ApiException.NotFound::new);
	}

}
