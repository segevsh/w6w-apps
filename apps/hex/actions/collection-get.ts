import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient } from "../lib/client.ts";

/** `GET /v1/collections/{collectionId}` — one collection with its creator and sharing. */
interface Input {
  collectionId: string;
}

const collectionGet: ActionDefinition<Input> = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description: "Fetch one collection by id.",
  params: [{ key: "collectionId", label: "Collection ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "sharing", type: "object", label: "Sharing settings" },
  ],

  execute(input, ctx) {
    return new HexClient(ctx).json(`/collections/${encodeId(input.collectionId)}`);
  },
};

export default collectionGet;
