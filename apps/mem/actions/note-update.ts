import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, pick } from "../lib/client.ts";
import { int, noteId, str, text, timestampHint } from "../lib/params.ts";

/** `PATCH /v2/notes/{note_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const noteUpdate: ActionDefinition<Input> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update Note",
  description:
    "Replace a note's whole markdown body. Needs the exact version the edit is based on (from Get Note or the last write); a stale version is rejected by Mem. A trashed note must be restored first.",
  idempotent: false,
  params: [
    noteId,
    text("content", "Content", {
      required: true,
      hint: "The complete new markdown body, not a patch. The first line becomes the title.",
    }),
    int("version", "Version", {
      required: true,
      hint: "The note version this update is based on.",
    }),
    str("updated_at", "Updated at", { hint: timestampHint + " Defaults to now." }),
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content", type: "string", label: "Stored markdown" },
    { key: "version", type: "number", label: "New version" },
    { key: "trashed_at", type: "string", label: "Trashed at, or null" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    return call(ctx, "PATCH", `/v2/notes/${encodeId(input.note_id)}`, {
      body: pick(input, ["content", "version", "updated_at"]),
    });
  },
};

export default noteUpdate;
