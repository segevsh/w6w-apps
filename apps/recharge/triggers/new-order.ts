import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  action,
  input: () => ({ createdAtMin: "1970-01-01T00:00:00Z", limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Order ID" }],
  sample: { id: 1, created_at: "2026-01-01T00:00:00Z" },
  maxPages: 1,
});
