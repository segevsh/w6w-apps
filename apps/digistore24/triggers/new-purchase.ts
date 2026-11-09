import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-purchases.ts";

export default pollFromListAction({
  key: "new-purchase",
  title: "New Purchase",
  description: "The run gets each newly recorded Digistore24 purchase.",
  action,
  input: (params) => ({
    ...params,
    sort_by: "date",
    sort_order: "desc",
    page_no: 1,
    page_size: 100,
  }),
  items: (result) => (result as { purchase_list?: unknown[] }).purchase_list ?? [],
  idOf: (item) => String((item as { purchase_id: string | number }).purchase_id),
  params: action.params,
  output: [{ key: "purchase_id", type: "string", label: "Purchase ID" }],
  sample: { purchase_id: "purchase_123", date: "2026-11-09 00:00:00" },
  maxPages: 1,
});
