import type { ActionDefinition } from "@w6w/types";
import { ack, call, encodeId } from "../lib/client.ts";
import { collectionId, noteId } from "../lib/params.ts";

/** `PUT /v2/collections/{collection_id}/notes/{note_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionAddNote: ActionDefinition<Input> = {
  key: "collection-add-note",
  type: "perform",
  resource: "collection",
  title: "Add Note to Collection",
  description: "Link a note to a collection.",
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
      "PUT",
      `/v2/collections/${encodeId(input.collection_id)}/notes/${encodeId(input.note_id)}`,
    ).then(ack);
  },
};

export default collectionAddNote;
