import { snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/list-deliveries.ts";

type Item = Record<string, unknown>;

export const clock = { now: (): number => Date.now() };

/** Days of deliveries each check reads; `listDeliveries` has no paging, so the window bounds it. */
const WINDOW_DAYS = 30;

/**
 * `listDeliveries` (physical goods) takes a `search[from]` date and answers every matching delivery
 * in one response with no order or paging (`digistore24.com/api/docs/paths/listDeliveries.yaml`).
 * The trigger reads the last 30 days (UTC date) and diffs the delivery ids.
 */
export default snapshotFeed({
  key: "new-delivery",
  title: "New Delivery",
  description: "The run gets each physical-goods delivery newly recorded in Digistore24.",
  action,
  input: () => ({
    from: new Date(clock.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10),
  }),
  items: (result) => (result as { delivery?: Item[] }).delivery ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Delivery ID" },
    { key: "purchase_id", type: "string", label: "Purchase ID" },
    { key: "type", type: "string", label: "Delivery type (request, delivery, return, …)" },
    { key: "product_name", type: "string", label: "Product name" },
    { key: "quantity_total", type: "number", label: "Quantity" },
    { key: "delivery_address", type: "object", label: "Delivery address" },
  ],
  sample: {
    id: 4711,
    purchase_id: "X26QE8GN",
    type: "request",
    product_name: "The Weight Loss Cake",
    quantity_total: 1,
    delivery_address: { first_name: "Helen", last_name: "Myer", city: "Some City", country: "US" },
  },
});
