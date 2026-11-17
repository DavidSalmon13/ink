package app.ink.api.settings;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import app.ink.api.common.SyncedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** The studio's single Settings row (seeded by V3). Money is integer agorot. */
@Entity
@Table(name = "settings")
public class Settings extends SyncedEntity {

	@Column(name = "minimum_price_agorot", nullable = false)
	private int minimumPriceAgorot;

	@Column(name = "minimum_minutes", nullable = false)
	private int minimumMinutes;

	@Column(name = "hourly_rate_agorot", nullable = false)
	private int hourlyRateAgorot;

	@Column(name = "design_hourly_rate_agorot", nullable = false)
	private int designHourlyRateAgorot;

	@Column(name = "needle_opening_cost_agorot", nullable = false)
	private int needleOpeningCostAgorot;

	@Column(name = "extra_needle_cost_agorot", nullable = false)
	private int extraNeedleCostAgorot;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "estimate_tables", nullable = false)
	private Map<String, Object> estimateTables;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "calibration_points", nullable = false)
	private List<Object> calibrationPoints;

	@Column(name = "auto_lock_seconds", nullable = false)
	private int autoLockSeconds;

	@Column(nullable = false)
	private String timezone;

	protected Settings() {
	}

	/** Whether this row already holds exactly these values (an identical retry). */
	boolean sameAs(SettingsController.SettingsInput in) {
		return minimumPriceAgorot == in.minimumPriceAgorot()
				&& minimumMinutes == in.minimumMinutes()
				&& hourlyRateAgorot == in.hourlyRateAgorot()
				&& designHourlyRateAgorot == in.designHourlyRateAgorot()
				&& needleOpeningCostAgorot == in.needleOpeningCostAgorot()
				&& extraNeedleCostAgorot == in.extraNeedleCostAgorot()
				&& Objects.equals(estimateTables, in.estimateTables())
				&& Objects.equals(calibrationPoints, in.calibrationPoints())
				&& autoLockSeconds == in.autoLockSeconds()
				&& Objects.equals(timezone, in.timezone());
	}

	void apply(SettingsController.SettingsInput in) {
		minimumPriceAgorot = in.minimumPriceAgorot();
		minimumMinutes = in.minimumMinutes();
		hourlyRateAgorot = in.hourlyRateAgorot();
		designHourlyRateAgorot = in.designHourlyRateAgorot();
		needleOpeningCostAgorot = in.needleOpeningCostAgorot();
		extraNeedleCostAgorot = in.extraNeedleCostAgorot();
		estimateTables = in.estimateTables();
		calibrationPoints = in.calibrationPoints();
		autoLockSeconds = in.autoLockSeconds();
		timezone = in.timezone();
	}

	SettingsController.SettingsView view() {
		return new SettingsController.SettingsView(getId(), getVersion(), getCreatedAt(), getUpdatedAt(),
				minimumPriceAgorot, minimumMinutes, hourlyRateAgorot, designHourlyRateAgorot,
				needleOpeningCostAgorot, extraNeedleCostAgorot, estimateTables, calibrationPoints,
				autoLockSeconds, timezone);
	}

}
