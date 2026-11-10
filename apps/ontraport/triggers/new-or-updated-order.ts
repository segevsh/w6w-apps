import { pollFromListAction } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";

export default pollFromListAction({
  key: "new-or-updated-order",
  title: "New Or Updated Order",
  description:
    "The run gets each Ontraport order that is created or modified (most recently modified first); an edit is a new event.",
  action: orderList,
  input: () => ({ range: 50, sort: "dlm", sortDir: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const r = item as { id?: unknown; dlm?: unknown };
    return `${String(r.id ?? "")}:${String(r.dlm ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Product name" },
    { key: "status", type: "string", label: "Status" },
    { key: "dlm", type: "string", label: "Date modified (Unix seconds)" },
  ],
  sample: {
    id: "9",
    contact_id: "101",
    name: "Course",
    status: "0",
    dlm: "1762700000",
  },
  maxPages: 1,
});
