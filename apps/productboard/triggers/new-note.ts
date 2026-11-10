import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/note-list.ts";

export default pollFromListAction({
  key: "new-note",
  title: "New Note",
  description: "The run gets each newly created note.",
  action,
  input: () => ({ createdFrom: "2026-01-01T00:00:00Z" }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Note ID" }],
  sample: { id: "note-2" },
  maxPages: 1,
});
