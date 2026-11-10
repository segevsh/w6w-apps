import { pollFromListAction } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "Poll newest orders through the existing order-list action.",
  action: orderList,
  input: () => ({ offset: 0, limit: 100 }),
  items: (result) => (result as { orders?: unknown[] }).orders ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Order ID" }],
  sample: { id: "sample-order" },
  maxPages: 1,
});
