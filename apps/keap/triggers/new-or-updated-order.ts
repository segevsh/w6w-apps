import orderList from "../actions/order-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each Keap order that is new or was modified (`GET /rest/v2/orders`, `order_by=modification_time desc`; a change is a new event). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-order",
  title: "New or Updated Order",
  description:
    "The run gets each Keap order that is new or was modified (`GET /rest/v2/orders`, `order_by=modification_time desc`; a change is a new event).",
  action: orderList,
  list: "orders",
  orderBy: "modification_time desc",
  stamp: "modification_time",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "modification_time", type: "string", label: "Modified at" },
  ],
  sample: {
    id: "1",
    title: "Order 1",
    status: "PAID",
    modification_time: "2026-11-10T12:30:00.000Z",
  },
});
