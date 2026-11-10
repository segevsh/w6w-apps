import { walkTrigger } from "../lib/walk.ts";
import orderList from "../actions/order-list.ts";

const LIMIT = 100;
type Order = { id?: unknown; created_at?: unknown; updated_at?: unknown };

/**
 * Recharge's order list takes `created_at_min` and orders by ascending id by default, so this is the
 * since-filter shape: a check asks `created_at_min = last check − 2 min`, follows `next_cursor` (a longer
 * window is drained over successive checks, the cursor moving only once it is drained), drops orders
 * whose `created_at` is before the first check (nothing that existed at the seed is ever emitted) and
 * dedupes by order id.
 */
export default walkTrigger({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  action: orderList as never,
  first: ({ sinceMs }) => ({ createdAtMin: new Date(sinceMs).toISOString(), limit: LIMIT }),
  next: (_req, result) => {
    const cursor = (result as { nextCursor?: string }).nextCursor;
    return cursor ? { limit: LIMIT, cursor } : undefined;
  },
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as Order).id ?? ""),
  stampOf: (item) => {
    const t = Date.parse(String((item as Order).created_at ?? ""));
    return Number.isFinite(t) ? t : undefined;
  },
  output: [{ key: "id", type: "number", label: "Order ID" }, {
    key: "updated_at",
    type: "string",
    label: "Updated at",
  }],
  sample: { id: 1, created_at: "2026-11-09T10:00:00Z", updated_at: "2026-11-09T10:00:00Z" },
});
