import type { ActionDefinition } from "@w6w/types";
import { ack, call, encodeId } from "../lib/client.ts";
import { noteId } from "../lib/params.ts";

/** `POST /v2/notes/{note_id}/restore` (Mem API v2). */
type Input = Record<string, unknown>;

const noteRestore: ActionDefinition<Input> = {
  key: "note-restore",
  type: "perform",
  resource: "note",
  title: "Restore Note",
  description: "Restore a trashed note. A note removed with Delete Note cannot be restored.",
  idempotent: true,
  params: [
    noteId,
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Mem accepted the change" },
    { key: "requestId", type: "string", label: "Mem request ID" },
  ],

  execute(input, ctx) {
    return call(ctx, "POST", `/v2/notes/${encodeId(input.note_id)}/restore`).then(ack);
  },
};

export default noteRestore;
