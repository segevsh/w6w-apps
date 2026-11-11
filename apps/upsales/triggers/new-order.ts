import orderList from "../actions/order-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-order",
  title: "New Order",
  action: orderList,
  output: [{ key: "id", type: "number", label: "Order ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
