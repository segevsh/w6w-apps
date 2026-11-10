import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/document-get-many.ts";

export default pollFromListAction({
  key: "new-document",
  title: "New Document",
  description: "The run gets each newly created document.",
  action,
  input: () => ({ orderBy: "-date_created", count: 100, page: 1 }),
  items: (r) => (r as { results?: unknown[] }).results ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Document ID" }],
  sample: { id: "doc-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
