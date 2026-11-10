import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  action,
  input: () => ({ from: 0, to: 4102444800, count: 100, skip: 0 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Order ID" }],
  sample: { id: "order_1", created_at: 1 },
  maxPages: 1,
});
