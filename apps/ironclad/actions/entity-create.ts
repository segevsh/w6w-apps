import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IroncladClient } from "../lib/client.ts";

interface Input {
  name: string;
  relationshipTypeKey?: unknown;
  status?: string;
  properties?: unknown;
}

const entityCreate: ActionDefinition<Input> = {
  key: "entity-create",
  type: "perform",
  resource: "entity",
  title: "Create Entity",
  description:
    "Create a legal entity. Properties are typed objects keyed by property id, like record properties.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "relationshipTypeKey",
      label: "Relationship types",
      type: "json",
      hint: 'Optional list of relationship type keys, e.g. ["counterparty"]. Entities defined in ' +
        "Ironclad's entity settings.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "ACTIVE",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ],
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      hint: 'Keyed by property id; each value is {"type": "string" | "number" | "boolean" | ' +
        '"date" | ..., "value": ...}.',
    },
  ],
  output: [{ key: "id", type: "string", label: "Entity ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json("/entities", {
      method: "POST",
      body: compact({
        name: input.name,
        relationshipTypeKey: asOptionalJson(input.relationshipTypeKey, "relationshipTypeKey"),
        status: input.status,
        properties: asOptionalJson(input.properties, "properties"),
      }),
    });
  },
};

export default entityCreate;
