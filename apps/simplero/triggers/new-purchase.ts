import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/purchase-list.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newPurchase = pollFromListAction({
  key: "new-purchase",
  title: "New Purchase",
  description: "The run gets each newly created purchase.",
  action,
  input: (_params) => ({ page: 1, perPage: 100 }),
  items: (result) => {
    const r = result as { items?: unknown[] };
    return r.items ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Purchase ID" }],
  sample: { id: 1 },
  maxPages: 1,
});

export default newPurchase;
