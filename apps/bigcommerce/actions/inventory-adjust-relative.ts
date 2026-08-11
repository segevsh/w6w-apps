import type { ActionDefinition } from "@w6w/types";
import { asJson, BigCommerceClient, compact } from "../lib/client.ts";

/**
 * `POST /v3/inventory/adjustments/relative` — add to or subtract from stock.
 *
 * The vendor is explicit about when to reach for this rather than the absolute
 * form: "Use this endpoint only when you do not know absolute quantities. For
 * example, making order-related inventory changes through a third-party may
 * require relative adjustments." A workflow reacting to an event ("two were
 * sold") is exactly that case — two absolute writes racing each other silently
 * discard one, while two deltas compose.
 *
 * Each item needs `location_id`, a positive or negative `quantity`, and **exactly
 * one** identifier: `sku`, `variant_id` or `product_id`. The request schema is a
 * `oneOf` over those three shapes, so sending two identifiers on one line is a
 * 422 rather than a preference.
 *
 * The documented payload limit is **2,000 items**.
 *
 * Only the relative form is exposed. The absolute form
 * (`PUT /v3/inventory/adjustments/absolute`) is a genuinely different and more
 * dangerous operation — it overwrites whatever is there, including work another
 * system did between your read and your write — and it is not what a workflow
 * reacting to an event should be reaching for.
 */
interface Input {
  items: unknown;
  reason?: string;
}

const inventoryAdjustRelative: ActionDefinition<Input> = {
  key: "inventory-adjust-relative",
  type: "perform",
  resource: "inventory",
  title: "Adjust Inventory (Relative)",
  description:
    "Add to or subtract from stock at a location. The safe form for order-driven changes — " +
    "deltas compose where absolute writes race.",
  // A delta applied twice moves stock twice. That is the price of the form that
  // does not lose concurrent updates, and it is why this is honestly `false`.
  idempotent: false,
  params: [
    {
      key: "items",
      label: "Adjustments",
      type: "json",
      required: true,
      placeholder: '[{ "location_id": 1, "sku": "SKU-1", "quantity": -2 }]',
      hint: "Each entry needs `location_id`, `quantity` (may be negative) and exactly ONE of " +
        "`sku`, `variant_id` or `product_id`. Up to 2000 entries.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "string",
      placeholder: "Order 1234 fulfilled",
      hint: "Recorded against the adjustment. Worth filling in — it is what makes an audit " +
        "readable later.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Adjustment result" }],

  async execute(input, ctx) {
    const items = asJson<unknown>(input.items, "Adjustments");
    if (!Array.isArray(items)) {
      throw new Error("Adjustments must be a JSON array of adjustment objects.");
    }
    if (items.length > 2000) {
      throw new Error(
        `BigCommerce accepts at most 2000 adjustment items per call; got ${items.length}.`,
      );
    }
    const body = compact({ items, reason: input.reason });
    return await new BigCommerceClient(ctx).v3("/inventory/adjustments/relative", {
      method: "POST",
      body,
    });
  },
};

export default inventoryAdjustRelative;
