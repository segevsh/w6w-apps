import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/document-get-many.ts";

type Doc = { id?: unknown; date_modified?: unknown };

/** `-date_modified` is a documented `order_by` value (descending). */
export default pollFromListAction({
  key: "new-or-updated-document",
  title: "New or Updated Document",
  description: "The run gets each PandaDoc document created or modified since the last check.",
  action,
  input: () => ({ orderBy: "-date_modified", count: 100, page: 1 }),
  items: (r) => (r as { results?: unknown[] }).results ?? [],
  idOf: (x) => `${String((x as Doc).id ?? "")}:${String((x as Doc).date_modified ?? "")}`,
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
    status: "document.sent",
    date_created: "2026-11-09T10:00:00.000000Z",
    date_modified: "2026-11-09T11:30:00.000000Z",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
