import type { ActionDefinition } from "@w6w/types";
import { ack, call, encodeId } from "../lib/client.ts";
import { collectionId } from "../lib/params.ts";

/** `DELETE /v2/collections/{collection_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionDelete: ActionDefinition<Input> = {
  key: "collection-delete",
  type: "perform",
  resource: "collection",
  title: "Delete Collection",
  description: "Delete a collection. Mem's reference does not say what happens to the notes in it.",
  idempotent: true,
  params: [
    collectionId,
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Mem accepted the change" },
    { key: "requestId", type: "string", label: "Mem request ID" },
  ],

  execute(input, ctx) {
    return call(ctx, "DELETE", `/v2/collections/${encodeId(input.collection_id)}`).then(ack);
  },
};

export default collectionDelete;
