package app.ink.api.quote;

import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * One tattoo within a {@link Quote}'s visit. A child row (device-generated UUID, no own version or soft
 * delete — it lives and dies with its quote), ordered by {@code position}. {@code estimatedMinutes} is the
 * server-recomputed estimate; {@code bodyPlacement} is the raw placement id (the time tier is derived from it
 * at pricing time). {@code sketchId} is nullable with no FK until the Sketch epic. Money-free: items carry no
 * price, only minutes.
 */
@Entity
@Table(name = "quote_item")
class QuoteItem {

	@Id
	private UUID id;

	@ManyToOne
	@JoinColumn(name = "quote_id", nullable = false)
	private Quote quote;

	@Column(nullable = false)
	private int position;

	@Column(nullable = false)
	private String description;

	@Column(nullable = false)
	private String size;

	@Column(name = "detail_level", nullable = false)
	private String detailLevel;

	@Column(nullable = false)
	private String shading;

	@Column(name = "body_placement", nullable = false)
	private String bodyPlacement;

	@Column(name = "design_source", nullable = false)
	private String designSource;

	@Column(name = "sketch_id")
	private UUID sketchId;

	@Column(name = "design_hours")
	private Double designHours;

	@Column(name = "estimated_minutes", nullable = false)
	private int estimatedMinutes;

	@Column(name = "estimated_minutes_override")
	private Integer estimatedMinutesOverride;

	protected QuoteItem() {
	}

	QuoteItem(UUID id, int position, String description, String size, String detailLevel, String shading,
			String bodyPlacement, String designSource, UUID sketchId, Double designHours, int estimatedMinutes,
			Integer estimatedMinutesOverride) {
		this.id = id;
		this.position = position;
		this.description = description;
		this.size = size;
		this.detailLevel = detailLevel;
		this.shading = shading;
		this.bodyPlacement = bodyPlacement;
		this.designSource = designSource;
		this.sketchId = sketchId;
		this.designHours = designHours;
		this.estimatedMinutes = estimatedMinutes;
		this.estimatedMinutesOverride = estimatedMinutesOverride;
	}

	/** Copies every field but the id and parent from {@code other} (an in-place edit of this item). */
	void copyFrom(QuoteItem other) {
		this.position = other.position;
		this.description = other.description;
		this.size = other.size;
		this.detailLevel = other.detailLevel;
		this.shading = other.shading;
		this.bodyPlacement = other.bodyPlacement;
		this.designSource = other.designSource;
		this.sketchId = other.sketchId;
		this.designHours = other.designHours;
		this.estimatedMinutes = other.estimatedMinutes;
		this.estimatedMinutesOverride = other.estimatedMinutesOverride;
	}

	void attachTo(Quote quote) {
		this.quote = quote;
	}

	/** Whether this item holds exactly the same content as {@code other} (the id and parent aside). */
	boolean sameContentAs(QuoteItem other) {
		return position == other.position && estimatedMinutes == other.estimatedMinutes
				&& Objects.equals(description, other.description) && Objects.equals(size, other.size)
				&& Objects.equals(detailLevel, other.detailLevel) && Objects.equals(shading, other.shading)
				&& Objects.equals(bodyPlacement, other.bodyPlacement)
				&& Objects.equals(designSource, other.designSource) && Objects.equals(sketchId, other.sketchId)
				&& Objects.equals(designHours, other.designHours)
				&& Objects.equals(estimatedMinutesOverride, other.estimatedMinutesOverride);
	}

	UUID getId() {
		return id;
	}

	int getPosition() {
		return position;
	}

	String getDescription() {
		return description;
	}

	String getSize() {
		return size;
	}

	String getDetailLevel() {
		return detailLevel;
	}

	String getShading() {
		return shading;
	}

	String getBodyPlacement() {
		return bodyPlacement;
	}

	String getDesignSource() {
		return designSource;
	}

	UUID getSketchId() {
		return sketchId;
	}

	Double getDesignHours() {
		return designHours;
	}

	int getEstimatedMinutes() {
		return estimatedMinutes;
	}

	Integer getEstimatedMinutesOverride() {
		return estimatedMinutesOverride;
	}

}
