import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/order-list.ts";

const trigger = pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "Fires for newly created Loop orders.",
  action,
  input: () => ({ limit: 100, sortOrder: "desc" }),
  items: (result) => (result as { orders?: unknown[] }).orders ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [{ key: "id", type: "string", label: "Order ID" }],
  sample: { id: "order-1" },
  maxPages: 1,
});

export default trigger;
