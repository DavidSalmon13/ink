# Cart & Checkout

> Product: ../../mission.md
> Status: in-progress
> Created: 2026-10-05 · Roles planned: PM, Tech

## Summary

Shoppers can build a cart (even as a guest), check out with a shipping address and mock payment, and get a confirmed order with stock reduced. This is the core purchase: from landing to confirmation in under 3 minutes.

## Documents

- [Product brief](product-brief.md)
- [Tech plan](tech-plan.md)

## Specs

| Spec | Status | Branch |
|---|---|---|
| 2026-10-18-cart | in-progress | feat/cart-checkout/cart |
| 2026-10-18-guest-cart-merge | shaped | feat/cart-checkout/guest-cart-merge |
| 2026-10-18-checkout-order | shaped | feat/cart-checkout/checkout-order |
| 2026-10-25-order-confirmation | shaped | feat/cart-checkout/order-confirmation |

All four specs are shaped, and cart is in progress. order-confirmation owns the confirmation page and the landing → confirmation e2e. Until it ships, a successful checkout lands on a 404, so checkout-order must not be released to production before it.
