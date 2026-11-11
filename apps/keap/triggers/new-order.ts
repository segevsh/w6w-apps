import orderList from "../actions/order-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap order, newest first (`GET /rest/v2/orders`, `order_by=order_time desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-order",
  title: "New Order",
  description:
    "The run gets each new Keap order, newest first (`GET /rest/v2/orders`, `order_by=order_time desc`).",
  action: orderList,
  list: "orders",
  orderBy: "order_time desc",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "order_time", type: "string", label: "Order time" },
  ],
  sample: { id: "1", title: "Order 1", status: "PAID", order_time: "2026-11-10T12:00:00.000Z" },
});
