import { pollFromListAction } from "../../_shared/poll/mod.ts";
import noteList from "../actions/note-list.ts";

/**
 * `GET` list with `sort_by=updated_at&sort_direction=DESC`: most recently updated first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-or-updated-note",
  title: "New or Updated Note",
  description: "The run gets each note when it is created or edited.",
  action: noteList,
  input: () => ({ sortBy: "updated_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { updated_at?: unknown }).updated_at ?? ""}`,
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: { id: 4401, content: "Asked for a demo", updated_at: "2026-11-10T09:00:00Z" },
  maxPages: 1,
});
