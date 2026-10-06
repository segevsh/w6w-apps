import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, pick } from "../lib/client.ts";
import { collectionId, str, text, timestampHint } from "../lib/params.ts";

/** `PATCH /v2/collections/{collection_id}` (Mem API v2). */
type Input = Record<string, unknown>;

const collectionUpdate: ActionDefinition<Input> = {
  key: "collection-update",
  type: "perform",
  resource: "collection",
  title: "Update Collection",
  description: "Change a collection's title and/or description. Fields left empty are not sent.",
  idempotent: true,
  params: [
    collectionId,
    str("title", "Title", { hint: "Up to 1,000 characters." }),
    text("description", "Description", { hint: "Up to 10,000 characters." }),
    str("updated_at", "Updated at", { hint: timestampHint }),
  ],
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    return call(ctx, "PATCH", `/v2/collections/${encodeId(input.collection_id)}`, {
      body: pick(input, ["title", "description", "updated_at"]),
    });
  },
};

export default collectionUpdate;
