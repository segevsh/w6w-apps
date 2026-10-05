import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";
import { shapeCollection } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get a collection",
  description:
    "Retrieve one collection and its group assignments. A collection has no name field in this API: names are end-to-end encrypted, so only the id and `externalId` are visible.",
  params: [
    {
      key: "collectionId",
      label: "Collection ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `collection-list`.",
    },
  ],
  output: [
    { key: "collection", type: "object", label: "The collection as returned" },
    { key: "id", type: "string", label: "Collection id" },
    { key: "externalId", type: "string", label: "External id" },
    { key: "groups", type: "array", label: "Groups with permissions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.collectionId, "collectionId");
    return shapeCollection(await new BitwardenClient(ctx).request(`/collections/${id}`));
  },
};

export default action;
