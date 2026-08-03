import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  dataCollectionId: string;
  consistentRead?: boolean;
}

/**
 * `GET /wix-data/v2/collections/{dataCollectionId}` — handler
 * `wix.data.v2.data_collection:GetDataCollection`.
 */
const getCollection: ActionDefinition<Input> = {
  key: "get-collection",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description:
    "Retrieve one CMS collection, including its field definitions — the way to discover a collection's field names and types before writing items into it.",
  params: [
    {
      key: "dataCollectionId",
      label: "Collection ID",
      type: "string",
      required: true,
      hint: "The collection's id as shown by List Collections, e.g. `Cities`.",
    },
    {
      key: "consistentRead",
      label: "Consistent read",
      type: "boolean",
      hint:
        "Read from the primary database. Slower, but returns changes made moments ago — Wix Data is otherwise eventually consistent.",
    },
  ],
  output: [{ key: "collection", type: "object", label: "Data collection" }],

  execute(input, ctx) {
    return new WixClient(ctx).request(
      `/wix-data/v2/collections/${encodeURIComponent(input.dataCollectionId)}`,
      { query: { consistentRead: input.consistentRead } },
    );
  },
};

export default getCollection;
