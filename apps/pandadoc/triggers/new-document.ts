import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/document-get-many.ts";

/** PandaDoc documents `order_by`: `date_created` ascending, `-date_created` descending. */
export default pollFromListAction({
  key: "new-document",
  title: "New Document",
  description: "The run gets each newly created PandaDoc document.",
  action,
  input: () => ({ orderBy: "-date_created", count: 100, page: 1 }),
  items: (r) => (r as { results?: unknown[] }).results ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Document status" },
    { key: "date_created", type: "string", label: "Created at" },
    { key: "date_modified", type: "string", label: "Modified at" },
  ],
  sample: {
    id: "msFYActMfJ9ScoQAnKCnd5",
    name: "Sales proposal",
    status: "document.draft",
    date_created: "2026-11-09T10:00:00.000000Z",
    date_modified: "2026-11-09T10:00:00.000000Z",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
