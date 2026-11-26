package app.ink.api.quote;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import app.ink.api.common.SyncedEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/**
 * One priced visit saved to a client (a quote that is only copied is never saved). A synced entity
 * (device UUID, soft delete, optimistic version) written through {@code VersionedWrites}. The prices and
 * per-visit minutes are the server's authoritative recompute from the {@code Settings} row — never trusted
 * from the client, and never changed when the rates change later (only a fresh edit recomputes). All money is
 * integer agorot. {@code items} are the tattoos of the visit, orphan-removed and ordered by {@code position}.
 */
@Entity
@Table(name = "quote")
class Quote extends SyncedEntity {

	@Column(name = "client_id", nullable = false)
	private UUID clientId;

	@Column(nullable = false)
	private String title;

	private String notes;

	@Column(name = "discount_type", nullable = false)
	private String discountType;

	@Column(name = "discount_value", nullable = false)
	private long discountValue;

	@Column(name = "extra_needles", nullable = false)
	private int extraNeedles;

	@Column(name = "price_override_agorot")
	private Long priceOverrideAgorot;

	@Column(name = "computed_price_agorot", nullable = false)
	private long computedPriceAgorot;

	@Column(name = "final_price_agorot", nullable = false)
	private long finalPriceAgorot;

	@Column(name = "estimated_minutes_total", nullable = false)
	private int estimatedMinutesTotal;

	@OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("position")
	private final List<QuoteItem> items = new ArrayList<>();

	protected Quote() {
	}

	Quote(UUID id, UUID clientId, String title, String notes, String discountType, long discountValue,
			int extraNeedles, Long priceOverrideAgorot, long computedPriceAgorot, long finalPriceAgorot,
			int estimatedMinutesTotal, List<QuoteItem> items) {
		super(id);
		set(clientId, title, notes, discountType, discountValue, extraNeedles, priceOverrideAgorot,
				computedPriceAgorot, finalPriceAgorot, estimatedMinutesTotal, items);
	}

	final void set(UUID clientId, String title, String notes, String discountType, long discountValue,
			int extraNeedles, Long priceOverrideAgorot, long computedPriceAgorot, long finalPriceAgorot,
			int estimatedMinutesTotal, List<QuoteItem> newItems) {
		this.clientId = clientId;
		this.title = title;
		this.notes = notes;
		this.discountType = discountType;
		this.discountValue = discountValue;
		this.extraNeedles = extraNeedles;
		this.priceOverrideAgorot = priceOverrideAgorot;
		this.computedPriceAgorot = computedPriceAgorot;
		this.finalPriceAgorot = finalPriceAgorot;
		this.estimatedMinutesTotal = estimatedMinutesTotal;
		mergeItems(newItems);
	}

	/**
	 * Replaces the item set in place: items gone from {@code newItems} are orphan-removed, items that stay are
	 * updated by id (so an edit never deletes-then-reinserts the same primary key), and new ids are attached.
	 */
	private void mergeItems(List<QuoteItem> newItems) {
		items.removeIf(existing -> newItems.stream().noneMatch(n -> n.getId().equals(existing.getId())));
		for (QuoteItem incoming : newItems) {
			QuoteItem existing = items.stream().filter(i -> i.getId().equals(incoming.getId())).findFirst()
					.orElse(null);
			if (existing == null) {
				incoming.attachTo(this);
				items.add(incoming);
			} else {
				existing.copyFrom(incoming);
			}
		}
		items.sort((a, b) -> Integer.compare(a.getPosition(), b.getPosition()));
	}

	/** Whether this quote already holds exactly these values and items (an identical retry — no version bump). */
	boolean sameAs(UUID clientId, String title, String notes, String discountType, long discountValue,
			int extraNeedles, Long priceOverrideAgorot, long computedPriceAgorot, long finalPriceAgorot,
			int estimatedMinutesTotal, List<QuoteItem> otherItems) {
		return Objects.equals(this.clientId, clientId) && Objects.equals(this.title, title)
				&& Objects.equals(this.notes, notes) && Objects.equals(this.discountType, discountType)
				&& this.discountValue == discountValue && this.extraNeedles == extraNeedles
				&& Objects.equals(this.priceOverrideAgorot, priceOverrideAgorot)
				&& this.computedPriceAgorot == computedPriceAgorot && this.finalPriceAgorot == finalPriceAgorot
				&& this.estimatedMinutesTotal == estimatedMinutesTotal && sameItems(otherItems);
	}

	private boolean sameItems(List<QuoteItem> otherItems) {
		if (items.size() != otherItems.size()) {
			return false;
		}
		for (int i = 0; i < items.size(); i++) {
			if (!items.get(i).sameContentAs(otherItems.get(i))) {
				return false;
			}
		}
		return true;
	}

	UUID getClientId() {
		return clientId;
	}

	String getTitle() {
		return title;
	}

	String getNotes() {
		return notes;
	}

	String getDiscountType() {
		return discountType;
	}

	long getDiscountValue() {
		return discountValue;
	}

	int getExtraNeedles() {
		return extraNeedles;
	}

	Long getPriceOverrideAgorot() {
		return priceOverrideAgorot;
	}

	long getComputedPriceAgorot() {
		return computedPriceAgorot;
	}

	long getFinalPriceAgorot() {
		return finalPriceAgorot;
	}

	int getEstimatedMinutesTotal() {
		return estimatedMinutesTotal;
	}

	/** The items ordered by position (the collection is kept sorted on every {@link #set}). */
	List<QuoteItem> getItems() {
		return items;
	}

}
