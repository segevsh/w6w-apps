import { pollFromListAction } from "../../_shared/poll/mod.ts";
import documentSearch from "../actions/document-search.ts";

export default pollFromListAction({
  key: "new-document",
  title: "New Document",
  description: "Runs when a document is created in SignRequest. The run gets the document.",
  action: documentSearch,
  input: () => ({ page: 1, limit: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [
    { key: "uuid", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created", type: "string", label: "Created at" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    uuid: "00000000-0000-4000-8000-000000000001",
    name: "Agreement",
    created: "2026-11-09T12:00:00Z",
    status: "se",
  },
  maxPages: 1,
});
