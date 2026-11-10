import { pollFromListAction } from "../../_shared/poll/mod.ts";
import noteList from "../actions/note-list.ts";

export default pollFromListAction({
  key: "new-or-updated-note",
  title: "New or Updated Note",
  description:
    "The run gets each Mem note that was created or updated since the last check, polled from the existing `note-list` action with `order_by=updated_at` (newest-updated first).",
  action: noteList,
  input: () => ({ page: "", limit: 100, order_by: "updated_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const r = item as { id?: unknown; updated_at?: unknown };
    return `${String(r.id ?? "")}:${String(r.updated_at ?? "")}`;
  },
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "note-1",
    title: "Weekly sync",
    collection_ids: [],
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
  maxPages: 1,
});
