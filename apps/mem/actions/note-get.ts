import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { noteId } from "../lib/params.ts";

/** `GET /v2/notes/{note_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const noteGet: ActionDefinition<Input> = {
  key: "note-get",
  type: "read",
  resource: "note",
  title: "Get Note",
  description:
    "Fetch one note with its full markdown content and current version (needed by Update Note). A trashed note is returned with trashed_at set.",
  params: [
    noteId,
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title (first line of the content)" },
    { key: "content", type: "string", label: "Full markdown content" },
    { key: "version", type: "number", label: "Content version, for Update Note" },
    { key: "collection_ids", type: "array", label: "Collection IDs" },
    { key: "trashed_at", type: "string", label: "When the note was trashed, or null" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/notes/${encodeId(input.note_id)}`);
  },
};

export default noteGet;
