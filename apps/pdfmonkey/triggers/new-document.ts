import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-documents.ts";

export default pollFromListAction({
  key: "new-document",
  title: "New Document",
  description: "The run gets each newly generated document.",
  action,
  input: () => ({ page: 1 }),
  items: (r) => (r as { document_cards?: unknown[] }).document_cards ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Document ID" }],
  sample: { id: "document-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
