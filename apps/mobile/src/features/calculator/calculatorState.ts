import { useReducer } from 'react';

import type { DiscountType, QuoteInput, QuoteOptionsInput } from '@/pricing';

import { newItem, toQuoteItem, type ItemState } from './item';

export type DiscountKind = 'percent' | 'amount';

/**
 * The "אפשרויות נוספות" options as the screen holds them. `discountValue` and `priceOverride` stay as
 * text while being typed (`priceOverride` is shekels, '' meaning "no manual price — use the computed
 * total"); `discountKind` is the %/₪ selector, applied only once a value is entered.
 */
export interface OptionsState {
  extraNeedles: number;
  discountKind: DiscountKind;
  discountValue: string;
  priceOverride: string;
}

/** The whole calculator: the tattoo items and the visit options, plus the id counter for new items. */
export interface CalculatorState {
  items: ItemState[];
  options: OptionsState;
  nextId: number;
}

export type CalculatorAction =
  | { type: 'addItem' }
  | { type: 'removeItem'; id: string }
  | { type: 'patchItem'; id: string; patch: Partial<ItemState> }
  | { type: 'patchOptions'; patch: Partial<OptionsState> };

/** A fresh calculator: one empty tattoo, no extra needles, no discount, no manual price. */
export function initCalculatorState(): CalculatorState {
  return {
    items: [newItem('0')],
    options: { extraNeedles: 0, discountKind: 'percent', discountValue: '', priceOverride: '' },
    nextId: 1,
  };
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'addItem':
      return {
        ...state,
        items: [...state.items, newItem(String(state.nextId))],
        nextId: state.nextId + 1,
      };
    case 'removeItem':
      // Keep at least one item — the screen only offers "remove" when more than one exists.
      if (state.items.length <= 1) return state;
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case 'patchItem':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id ? { ...item, ...action.patch } : item,
        ),
      };
    case 'patchOptions':
      return { ...state, options: { ...state.options, ...action.patch } };
    default:
      return state;
  }
}

export function useCalculatorState() {
  return useReducer(calculatorReducer, undefined, initCalculatorState);
}

/** Shekels as typed → integer agorot, or null when the field is empty or not a non-negative number. */
function shekelsToAgorot(text: string): number | null {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

/** Maps the options UI to the pricing module's input: an empty/zero discount value means no discount. */
export function toQuoteOptions(options: OptionsState): QuoteOptionsInput {
  const value = Number.parseFloat(options.discountValue);
  const hasDiscount = Number.isFinite(value) && value > 0;

  let discountType: DiscountType = 'none';
  let discountValue = 0;
  if (hasDiscount) {
    if (options.discountKind === 'percent') {
      discountType = 'percent';
      discountValue = value;
    } else {
      discountType = 'amount';
      discountValue = Math.round(value * 100);
    }
  }

  return {
    extraNeedles: options.extraNeedles,
    discountType,
    discountValue,
    priceOverrideAgorot: shekelsToAgorot(options.priceOverride),
  };
}

/** The whole calculator as the pricing module's `calcQuote` input. */
export function toQuoteInput(state: CalculatorState): QuoteInput {
  return {
    items: state.items.map(toQuoteItem),
    options: toQuoteOptions(state.options),
  };
}
