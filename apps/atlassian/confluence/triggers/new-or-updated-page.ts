import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/page-list.ts";

export default pollFromListAction({
  key: "new-or-updated-page",
  title: "New or Updated Page",
  description: "The run gets each page created or modified since the last successful check.",
  action,
  input: () => ({ sort: "-modified-date", limit: 100, returnAll: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => {
    const page = item as { id?: unknown; version?: { number?: unknown } };
    return `${page.id ?? ""}:${page.version?.number ?? ""}`;
  },
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "version", type: "object", label: "Page version" },
  ],
  sample: { id: "page-101", version: { number: 2 } },
  maxPages: 1,
});
