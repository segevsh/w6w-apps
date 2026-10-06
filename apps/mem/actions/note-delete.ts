import type { ActionDefinition } from "@w6w/types";
import { ack, call, encodeId } from "../lib/client.ts";
import { noteId } from "../lib/params.ts";

/** `DELETE /v2/notes/{note_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const noteDelete: ActionDefinition<Input> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description:
    "Permanently delete a note. This cannot be undone; use Trash Note for a recoverable removal.",
  idempotent: true,
  params: [
    noteId,
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Mem accepted the change" },
    { key: "requestId", type: "string", label: "Mem request ID" },
  ],

  execute(input, ctx) {
    return call(ctx, "DELETE", `/v2/notes/${encodeId(input.note_id)}`).then(ack);
  },
};

export default noteDelete;
