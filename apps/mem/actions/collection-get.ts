import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { collectionId } from "../lib/params.ts";

/** `GET /v2/collections/{collection_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionGet: ActionDefinition<Input> = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description: "Fetch one collection with its note count.",
  params: [
    collectionId,
  ],
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
    { key: "note_count", type: "number", label: "Notes in the collection" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/collections/${encodeId(input.collection_id)}`);
  },
};

export default collectionGet;
