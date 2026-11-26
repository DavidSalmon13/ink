import type { QuoteInput, QuoteItemInput } from '@/api/quotes';
// Import from the leaf modules, not the calculator barrel: the barrel pulls in CalculatorScreen, which
// imports this feature, and the value imports below (toQuoteItem/toQuoteOptions) would form a runtime cycle.
import { toQuoteOptions, type CalculatorState } from '@/features/calculator/calculatorState';
import { toQuoteItem } from '@/features/calculator/item';

/**
 * The title Aya sees pre-filled in the save sheet (AC6): the item descriptions joined in order, blanks
 * dropped. She can edit it before saving; an all-blank result leaves the field empty (save stays disabled).
 */
export function defaultQuoteTitle(state: CalculatorState): string {
  return state.items
    .map((item) => item.description.trim())
    .filter((description) => description.length > 0)
    .join(', ');
}

export interface BuildQuoteArgs {
  clientId: string;
  title: string;
  notes: string;
  /** One device UUID per item, aligned to `state.items` by index, so a retry reuses the same ids (AC3). */
  itemIds: string[];
  /**
   * The quote's last-seen version when editing a reopened quote (client-quotes AC4): sent so the server can
   * reject a stale update with `version_conflict`. Absent on the create path — the server then mints a new
   * quote.
   */
  version?: number;
}

/**
 * Serializes the calculator state to the quote the API saves (AC6). The item/option converters are reused
 * from the calculator so the mapping never drifts: {@link toQuoteOptions} gives the visit-level discount,
 * extra needles and manual price, and {@link toQuoteItem} parses each item's text fields to numbers. The
 * **raw** body-placement id is sent (the server resolves the time tier), and no prices are sent — the server
 * recomputes `estimatedMinutes` and the totals from the Settings row (AC3).
 */
export function buildQuoteInput(
  state: CalculatorState,
  { clientId, title, notes, itemIds, version }: BuildQuoteArgs,
): QuoteInput {
  const options = toQuoteOptions(state.options);

  const items: QuoteItemInput[] = state.items.map((item, index) => {
    const priced = toQuoteItem(item);
    return {
      id: itemIds[index],
      position: index,
      description: item.description.trim(),
      size: item.size,
      detailLevel: item.detail,
      shading: item.shading,
      bodyPlacement: item.placement,
      designSource: item.designSource,
      sketchId: null,
      designHours: item.designSource === 'custom_design' ? priced.designHours : null,
      estimatedMinutesOverride: priced.estimatedMinutesOverride,
    };
  });

  const trimmedNotes = notes.trim();
  return {
    version,
    clientId,
    title: title.trim(),
    notes: trimmedNotes.length > 0 ? trimmedNotes : null,
    discountType: options.discountType,
    discountValue: options.discountValue,
    extraNeedles: options.extraNeedles,
    priceOverrideAgorot: options.priceOverrideAgorot,
    items,
  };
}
