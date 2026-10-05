import type { ActionDefinition } from "@w6w/types";
import { associations, BitwardenClient, compact } from "../lib/client.ts";
import { shapeGroup } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create a group",
  description: "Create a group. Names are limited to 100 characters, `externalId` to 300.",
  idempotent: false,
  params: [
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
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const body = compact({
      name,
      externalId: p.externalId === undefined ? undefined : String(p.externalId),
      collections: associations(p.collections, "collections"),
    });
    return shapeGroup(await new BitwardenClient(ctx).request("/groups", { method: "POST", body }));
  },
};

export default action;
