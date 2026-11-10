import { pollFromListAction } from "../../_shared/poll/mod.ts";
import noteList from "../actions/note-list.ts";

/**
 * `GET` list with `sort_by=created_at&sort_direction=DESC`: newest created first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-note",
  title: "New Note",
  description: "The run gets each newly created note.",
  action: noteList,
  input: () => ({ sortBy: "created_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 4401, content: "Asked for a demo", created_at: "2026-11-10T09:00:00Z" },
  maxPages: 1,
});
