import { pollFromListAction } from "../../_shared/poll/mod.ts";
import purchaseList from "../actions/purchase-list.ts";

export default pollFromListAction({
  key: "new-purchase",
  title: "New Purchase",
  description: "The run gets each newly recorded Ontraport purchase (newest by date first).",
  action: purchaseList,
  input: () => ({ range: 50, sort: "date", sortDir: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Purchase ID" },
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "product_id", type: "string", label: "Product ID" },
    { key: "name", type: "string", label: "Product name" },
    { key: "total_price", type: "string", label: "Total price" },
    { key: "date", type: "string", label: "Date (Unix seconds)" },
  ],
  sample: {
    id: "55",
    contact_id: "101",
    product_id: "7",
    name: "Course",
    total_price: "49",
    date: "1762700000",
  },
  maxPages: 1,
});
