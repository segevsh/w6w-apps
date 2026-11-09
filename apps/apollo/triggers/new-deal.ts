import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/deal-list.ts";

export default pollFromListAction({
  key: "new-deal",
  title: "New Deal",
  description: "The run gets each newly created deal.",
  action,
  input: () => ({ sort_by_field: "closed_date", page: 1, per_page: 100 }),
  items: (result) => (result as { deals?: unknown[] }).deals ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Deal ID" }],
  sample: { id: "deal-101" },
  maxPages: 1,
});
