import { pollFromListAction } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order in the store.",
  action: orderList,
  input: () => ({ sort: "date_created:desc", limit: 100, page: 1 }),
  items: (result) => {
    const orders = (result as { orders?: unknown[] }).orders;
    return Array.isArray(orders) ? orders : [];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "status", type: "string", label: "Order status" },
    { key: "date_created", type: "string", label: "Date created" },
  ],
  sample: {
    id: 101,
    status: "Awaiting Fulfillment",
    date_created: "Mon, 09 Nov 2026 10:00:00 +0000",
  },
  maxPages: 1,
});
