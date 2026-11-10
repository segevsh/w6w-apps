import { pollFromListAction } from "../../_shared/poll/mod.ts";
import noteList from "../actions/note-list.ts";

export default pollFromListAction({
  key: "new-note",
  title: "New Note",
  description:
    "The run gets each newly created Mem note, polled from the existing `note-list` action with `order_by=created_at`.",
  action: noteList,
  input: () => ({ page: "", limit: 100, order_by: "created_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
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
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
