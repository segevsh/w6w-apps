import type { ActionDefinition } from "@w6w/types";
import noteList from "../actions/note-list.ts";
import { type Note, notesSince, sinceFilterTrigger } from "../lib/triggers.ts";

// Productboard documents `createdFrom` on GET /v2/notes ("filter by creation date, inclusive
// bounds"), so this is a since-filter poll (brief 9.1b).
export default sinceFilterTrigger<Note>({
  key: "new-note",
  title: "New Note",
  description: "The run gets each newly created note.",
  load: notesSince(noteList as unknown as ActionDefinition, "createdFrom"),
  idOf: (note) => String(note.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: { id: "note-2", title: "Customer asks for SSO", createdAt: "2026-11-10T09:00:00Z" },
});
