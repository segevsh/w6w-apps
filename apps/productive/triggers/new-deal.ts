import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/deal-list.ts";

export default pollFromListAction({
  key: "new-deal",
  title: "New Deal",
  description: "The run gets each newly created deal.",
  action,
  input: () => ({ sort: "-created_at", pageSize: 100, pageNumber: 1 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Deal ID" }],
  sample: { id: "deal-1" },
  maxPages: 1,
});
