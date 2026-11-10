import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/page-list.ts";

export default pollFromListAction({
  key: "new-page",
  title: "New Page",
  description: "The run gets each newly created page.",
  action,
  input: () => ({ sort: "-created-date", limit: 100, returnAll: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Page ID" }],
  sample: { id: "page-101" },
  maxPages: 1,
});
