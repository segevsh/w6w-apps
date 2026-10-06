import type { ActionDefinition } from "@w6w/types";
import { ack, call, encodeId } from "../lib/client.ts";
import { collectionId, noteId } from "../lib/params.ts";

/** `DELETE /v2/collections/{collection_id}/notes/{note_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionRemoveNote: ActionDefinition<Input> = {
  key: "collection-remove-note",
  type: "perform",
  resource: "collection",
  title: "Remove Note from Collection",
  description: "Unlink a note from a collection. The note itself is kept.",
  idempotent: true,
  params: [
    collectionId,
    noteId,
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Mem accepted the change" },
    { key: "requestId", type: "string", label: "Mem request ID" },
  ],

  execute(input, ctx) {
    return call(
      ctx,
      "DELETE",
      `/v2/collections/${encodeId(input.collection_id)}/notes/${encodeId(input.note_id)}`,
    ).then(ack);
  },
};

export default collectionRemoveNote;
