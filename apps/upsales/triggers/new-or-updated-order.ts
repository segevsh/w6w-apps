import orderList from "../actions/order-list.ts";
import { updatedListTrigger } from "../lib/list-trigger.ts";
export default updatedListTrigger({
  key: "new-or-updated-order",
  title: "New or Updated Order",
  noun: "order",
  action: orderList,
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "modDate", type: "string", label: "Modified at" },
  ],
  sample: { id: 1, modDate: "2026-11-10T00:00:00Z" },
});
