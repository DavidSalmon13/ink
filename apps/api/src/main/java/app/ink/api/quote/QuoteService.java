package app.ink.api.quote;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import app.ink.api.client.Client;
import app.ink.api.common.ApiException;
import app.ink.api.common.VersionedWrites;
import app.ink.api.pricing.Estimate;
import app.ink.api.pricing.PricingCalculator;
import app.ink.api.pricing.PricingSettings;
import app.ink.api.pricing.QuoteBreakdown;
import app.ink.api.quote.QuoteController.QuoteInput;
import app.ink.api.quote.QuoteController.QuoteItemInput;
import app.ink.api.quote.QuoteController.QuoteItemView;
import app.ink.api.quote.QuoteController.QuoteView;
import app.ink.api.settings.Settings;
import jakarta.persistence.EntityManager;

/**
 * Create-or-update, read and soft-delete for quotes, with the server's authoritative recompute. The quote is
 * written through {@link VersionedWrites} exactly like a client, but every price and minute is computed here
 * from the seeded {@code Settings} row via {@code app.ink.api.pricing} — the client-sent totals are ignored
 * (AC3). The {@code clientId} must reference a live client; stored prices never change when the rates change
 * later, because a recompute only happens on an actual edit.
 */
@Service
class QuoteService {

	private final VersionedWrites writes;
	private final EntityManager em;

	QuoteService(VersionedWrites writes, EntityManager em) {
		this.writes = writes;
		this.em = em;
	}

	/** PUT create-or-update: recompute from Settings, then store under the versioned-write rules. */
	QuoteView save(UUID id, QuoteInput in) {
		requireLiveClient(in.clientId());

		PricingSettings settings = settings().pricing();
		QuoteBreakdown breakdown = PricingCalculator.calcQuote(toPricingInput(in), settings);
		List<QuoteItem> items = recomputedItems(in, breakdown);
		long computed = breakdown.computed();
		long finalPrice = breakdown.finalPrice();
		int minutes = breakdown.visitMinutes();

		return writes.put(Quote.class, id, in.version(), in,
				p -> new Quote(id, p.clientId(), p.title(), p.notes(), p.discountType(), p.discountValue(),
						p.extraNeedles(), p.priceOverrideAgorot(), computed, finalPrice, minutes, items),
				(q, p) -> q.sameAs(p.clientId(), p.title(), p.notes(), p.discountType(), p.discountValue(),
						p.extraNeedles(), p.priceOverrideAgorot(), computed, finalPrice, minutes, items),
				(q, p) -> q.set(p.clientId(), p.title(), p.notes(), p.discountType(), p.discountValue(),
						p.extraNeedles(), p.priceOverrideAgorot(), computed, finalPrice, minutes, items),
				QuoteService::view);
	}

	QuoteView get(UUID id) {
		return writes.get(Quote.class, id, QuoteService::view);
	}

	void delete(UUID id) {
		writes.softDelete(Quote.class, id);
	}

	/** 404 when the quote's client doesn't exist or is soft-deleted (AC3). */
	private void requireLiveClient(UUID clientId) {
		Client client = em.find(Client.class, clientId);
		if (client == null || client.isDeleted()) {
			throw new ApiException.NotFound();
		}
	}

	/** The single seeded Settings row (V3). */
	private Settings settings() {
		return em.createQuery("select s from Settings s where s.deletedAt is null", Settings.class)
				.getResultStream().findFirst().orElseThrow(ApiException.NotFound::new);
	}

	/** Maps the request to a pricing input: each item's raw body placement becomes its time tier. */
	private static app.ink.api.pricing.QuoteInput toPricingInput(QuoteInput in) {
		List<app.ink.api.pricing.QuoteInput.Item> items = in.items().stream()
				.map(it -> new app.ink.api.pricing.QuoteInput.Item(it.description(), it.size(), it.detailLevel(),
						it.shading(), Estimate.placementTierOf(it.bodyPlacement()), it.designSource(),
						it.designHours(), it.estimatedMinutesOverride()))
				.toList();
		app.ink.api.pricing.QuoteInput.Options options = new app.ink.api.pricing.QuoteInput.Options(
				in.extraNeedles(), in.discountType(), in.discountValue(), in.priceOverrideAgorot());
		return new app.ink.api.pricing.QuoteInput(items, options);
	}

	/** Builds the stored items, each carrying the server-recomputed estimate (index-aligned with the input). */
	private static List<QuoteItem> recomputedItems(QuoteInput in, QuoteBreakdown breakdown) {
		List<QuoteItem> items = new ArrayList<>(in.items().size());
		for (int i = 0; i < in.items().size(); i++) {
			QuoteItemInput it = in.items().get(i);
			int estimated = breakdown.itemsEstimatedMinutes().get(i);
			items.add(new QuoteItem(it.id(), it.position(), it.description(), it.size(), it.detailLevel(),
					it.shading(), it.bodyPlacement(), it.designSource(), it.sketchId(), it.designHours(),
					estimated, it.estimatedMinutesOverride()));
		}
		return items;
	}

	static QuoteView view(Quote q) {
		List<QuoteItemView> items = q.getItems().stream()
				.map(it -> new QuoteItemView(it.getId(), it.getPosition(), it.getDescription(), it.getSize(),
						it.getDetailLevel(), it.getShading(), it.getBodyPlacement(), it.getDesignSource(),
						it.getSketchId(), it.getDesignHours(), it.getEstimatedMinutes(),
						it.getEstimatedMinutesOverride()))
				.toList();
		return new QuoteView(q.getId(), q.getVersion(), q.getCreatedAt(), q.getUpdatedAt(), q.getClientId(),
				q.getTitle(), q.getNotes(), q.getDiscountType(), q.getDiscountValue(), q.getExtraNeedles(),
				q.getPriceOverrideAgorot(), q.getComputedPriceAgorot(), q.getFinalPriceAgorot(),
				q.getEstimatedMinutesTotal(), items);
	}

}
