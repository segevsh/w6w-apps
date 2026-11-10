import { pollFromListAction } from "../../_shared/poll/mod.ts";
import templateList from "../actions/template-list.ts";

// Lob documents this list as "sorted by creation date, with the most recently created appearing
// first" (https://docs.lob.com/); the sort is also sent explicitly where the action takes one.
export default pollFromListAction({
  key: "new-template",
  title: "New Template",
  description: "The run gets each newly saved template.",
  action: templateList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "date_created", type: "string", label: "Created at" },
  ],
  sample: { id: "tmpl_123", date_created: "2026-11-10T09:00:00.000Z" },
  maxPages: 1,
});
