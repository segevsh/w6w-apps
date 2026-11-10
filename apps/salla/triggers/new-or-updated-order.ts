import { pollFromListAction } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-or-updated-order",
  title: "New or Updated Order",
  description: "The run gets each newly created or updated order.",
  action: orderList,
  input: () => ({ sort_by: "updated_at-desc", page: 1, per_page: 60 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const order = item as { id?: unknown; updated_at?: unknown };
    return `${order.id ?? ""}:${order.updated_at ?? ""}`;
  },
  output: [{ key: "id", type: "number", label: "Order ID" }],
  sample: { id: 101, updated_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
