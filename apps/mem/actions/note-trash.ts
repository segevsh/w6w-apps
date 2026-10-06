import type { ActionDefinition } from "@w6w/types";
import { ack, call, encodeId } from "../lib/client.ts";
import { noteId } from "../lib/params.ts";

/** `POST /v2/notes/{note_id}/trash` (Mem API v2). */
type Input = Record<string, unknown>;

const noteTrash: ActionDefinition<Input> = {
  key: "note-trash",
  type: "perform",
  resource: "note",
  title: "Trash Note",
  description: "Move a note to the trash. Recoverable with Restore Note.",
  idempotent: true,
  params: [
    noteId,
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Mem accepted the change" },
    { key: "requestId", type: "string", label: "Mem request ID" },
  ],

  execute(input, ctx) {
    return call(ctx, "POST", `/v2/notes/${encodeId(input.note_id)}/trash`).then(ack);
  },
};

export default noteTrash;
