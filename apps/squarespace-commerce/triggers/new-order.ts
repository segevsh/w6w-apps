import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-orders.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newOrder = pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order.",
  action,
  input: (_params) => ({}),
  items: (result) => {
    const r = result as { result?: unknown[] };
    return r.result ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Order ID" }],
  sample: { id: "order-a" },
  maxPages: 1,
});

export default newOrder;
