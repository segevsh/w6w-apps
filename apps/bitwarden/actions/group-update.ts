import type { ActionDefinition } from "@w6w/types";
import { assertUuid, associations, BitwardenClient, compact } from "../lib/client.ts";
import { shapeGroup } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Update a group",
  description:
    "Replace a group's name, `externalId` and collection assignments. A PUT: the spec documents no partial update, so send the complete `collections` list you want kept.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      validation: { maxLength: 100 },
    },
    { key: "externalId", label: "External ID", type: "string", validation: { maxLength: 300 } },
    {
      key: "collections",
      label: "Collections",
      type: "json",
      hint:
        'Collections this group can access. JSON array of `{ "id": "<uuid>", "readOnly": false, "hidePasswords": false, "manage": false }`. `readOnly` is required by Bitwarden and defaults to false here.',
    },
  ],
  output: [
    { key: "group", type: "object", label: "The group as returned" },
    { key: "id", type: "string", label: "Group id" },
    { key: "name", type: "string", label: "Name" },
    { key: "externalId", type: "string", label: "External id" },
    { key: "collections", type: "array", label: "Collections with permissions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.groupId, "groupId");
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const body = compact({
      name,
      externalId: p.externalId === undefined ? undefined : String(p.externalId),
      collections: associations(p.collections, "collections"),
    });
    return shapeGroup(
      await new BitwardenClient(ctx).request(`/groups/${id}`, { method: "PUT", body }),
    );
  },
};

export default action;
