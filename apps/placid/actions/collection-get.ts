import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  collection_id: string;
}

/** `GET /collections/{collection_id}`. */
const action: ActionDefinition<Input, unknown> = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description: "Retrieve a template collection with its template UUIDs.",
  params: [
    { key: "collection_id", label: "Collection ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "custom_data", type: "string", label: "Custom data" },
    { key: "template_uuids", type: "array", label: "Template UUIDs" },
  ],

  async execute(input, ctx) {
    const id = required(input.collection_id, "collection_id");
    return await new PlacidClient(ctx).json(`/collections/${encodeURIComponent(id)}`);
  },
};

export default action;
