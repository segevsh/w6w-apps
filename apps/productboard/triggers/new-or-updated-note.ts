import type { ActionDefinition } from "@w6w/types";
import noteList from "../actions/note-list.ts";
import { type Note, notesSince, sinceFilterTrigger } from "../lib/triggers.ts";

// Productboard documents `updatedFrom` on GET /v2/notes; the id carries `updatedAt` so an edit is
// a new event (brief 9.2).
export default sinceFilterTrigger<Note>({
  key: "new-or-updated-note",
  title: "New or Updated Note",
  description: "The run gets each note that was created or updated.",
  load: notesSince(noteList as unknown as ActionDefinition, "updatedFrom"),
  idOf: (note) => `${note.id ?? ""}:${note.updatedAt ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "note-2",
    title: "Customer asks for SSO",
    updatedAt: "2026-11-10T09:30:00Z",
  },
});
