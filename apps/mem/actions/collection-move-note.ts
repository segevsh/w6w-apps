import type { ActionDefinition } from "@w6w/types";
import { ack, call, encodeId, pick } from "../lib/client.ts";
import { noteId, str } from "../lib/params.ts";

/** `POST /v2/collections/{source_collection_id}/notes/{note_id}/move` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionMoveNote: ActionDefinition<Input> = {
  key: "collection-move-note",
  type: "perform",
  resource: "collection",
  title: "Move Note Between Collections",
  description: "Move a note from one collection to another.",
  idempotent: false,
  params: [
    str("source_collection_id", "Source collection ID", { required: true }),
    noteId,
    str("target_collection_id", "Target collection ID", { required: true }),
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Mem accepted the change" },
    { key: "requestId", type: "string", label: "Mem request ID" },
  ],

  execute(input, ctx) {
    return call(
      ctx,
      "POST",
      `/v2/collections/${encodeId(input.source_collection_id)}/notes/${
        encodeId(input.note_id)
      }/move`,
      { body: pick(input, ["target_collection_id"]) },
    ).then(ack);
  },
};

export default collectionMoveNote;
