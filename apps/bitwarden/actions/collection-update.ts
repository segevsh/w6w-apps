import type { ActionDefinition } from "@w6w/types";
import { assertUuid, associations, BitwardenClient, compact } from "../lib/client.ts";
import { shapeCollection } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "collection-update",
  type: "perform",
  resource: "collection",
  title: "Update a collection",
  description:
    "Set a collection's `externalId` and its group assignments. This is a PUT, not a PATCH, and the spec does not say omitted fields are preserved \u2014 send the full set of `groups` you want the collection to end up with. Collections cannot be created through the Public API (the spec has no POST), only updated and deleted.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true, default: "" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Max 300 characters. Links the collection to another system.",
    },
    {
      key: "groups",
      label: "Groups",
      type: "json",
      hint:
        'Groups assigned to the collection. JSON array of `{ "id": "<uuid>", "readOnly": false, "hidePasswords": false, "manage": false }`. `readOnly` is required by Bitwarden and defaults to false here.',
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
    const body = compact({
      externalId: p.externalId === undefined ? undefined : String(p.externalId),
      groups: associations(p.groups, "groups"),
    });
    return shapeCollection(
      await new BitwardenClient(ctx).request(`/collections/${id}`, { method: "PUT", body }),
    );
  },
};

export default action;
