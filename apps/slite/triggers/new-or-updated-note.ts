import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/note-list.ts";

interface Item {
  id: string;
  lastEditedAt?: string;
}

/**
 * `GET /v1/notes?orderBy=lastEditedAt_DESC` — the documented `ListNotesOrderBy` enum on List notes.
 * The id carries `lastEditedAt`, so an edit is a new event. Slite documents no created-time order
 * (`listPosition` is "seeded from the creation date" but "manual reordering overrides it"), so
 * there is no separate `new-note` trigger.
 */
export default pollFromListAction({
  key: "new-or-updated-note",
  title: "New or Updated Note",
  description: "The run gets each note that is created or edited.",
  action,
  input: (params) => ({ ...params, orderBy: "lastEditedAt_DESC" }),
  items: (result) => (result as { notes?: unknown[] }).notes ?? [],
  idOf: (item) => {
    const n = item as Item;
    return `${n.id}:${n.lastEditedAt ?? ""}`;
  },
  params: (action.params ?? []).filter((p) => p.key === "ownerId" || p.key === "parentNoteId"),
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "url", type: "string", label: "URL" },
    { key: "lastEditedAt", type: "string", label: "Last edited at" },
  ],
  sample: {
    id: "noteId1",
    title: "Onboarding guide",
    url: "https://acme.slite.com/api/s/noteId1/Onboarding-guide",
    lastEditedAt: "2026-11-09T10:30:00.000Z",
  },
  maxPages: 1,
});
