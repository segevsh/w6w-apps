import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contractList from "../actions/contract-list.ts";

export default pollFromListAction({
  key: "new-contract",
  title: "New Contract",
  description: "The run gets each newly created contract.",
  action: contractList,
  input: () => ({ limit: 100, orderDirection: "desc" }),
  // `contract-list` returns the contracts array itself (it walks `page.cursor` internally).
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Contract ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Contract type" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "abc123", title: "Design retainer", type: "ongoing_time_based", status: "new" },
  maxPages: 1,
});
