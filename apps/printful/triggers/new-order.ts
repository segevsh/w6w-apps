import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  action,
  input: () => ({ limit: 100, offset: 0 }),
  items: (r) => (r as { orders?: unknown[] }).orders ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Order ID" }],
  sample: { id: 2 },
  maxPages: 1,
});
