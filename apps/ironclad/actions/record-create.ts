import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, compact, IroncladClient } from "../lib/client.ts";

interface Input {
  type: string;
  name: string;
  properties: Record<string, unknown> | string;
  links?: unknown;
  parent?: unknown;
  children?: unknown;
  addressAsObject?: boolean;
}

const recordCreate: ActionDefinition<Input> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description:
    'Create a contract record by naming its type and metadata properties. Each property is a typed object, for example {"counterpartyName": {"type": "string", "value": "Acme"}}.',
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Record type",
      type: "string",
      required: true,
      hint: "A record type id from Get Record Schema, e.g. `contract`.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      required: true,
      hint: 'Keyed by property id; each value is {"type": "...", "value": ...} — string, date, ' +
        "monetary_amount ({currency, amount}) and so on. Get Record Schema lists the ids.",
    },
    {
      key: "links",
      label: "Links",
      type: "json",
      hint: 'Optional list of {"recordId": "..."} to link this record to.',
    },
    {
      key: "parent",
      label: "Parent",
      type: "json",
      hint: 'Optional {"recordId": "...", "parentLinkType": "amendment" | "obligation"}.',
    },
    {
      key: "children",
      label: "Children",
      type: "json",
      hint: 'Optional list of {"recordId": "..."} to attach as children.',
    },
    { key: "addressAsObject", label: "Addresses as objects", type: "boolean", default: false },
  ],
  output: [{ key: "id", type: "string", label: "Record ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "properties", type: "object", label: "Properties" }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json("/records", {
      method: "POST",
      query: { addressAsObject: input.addressAsObject ? true : undefined },
      body: compact({
        type: input.type,
        name: input.name,
        properties: asJson<Record<string, unknown>>(input.properties, "properties"),
        links: asOptionalJson(input.links, "links"),
        parent: asOptionalJson(input.parent, "parent"),
        children: asOptionalJson(input.children, "children"),
      }),
    });
  },
};

export default recordCreate;
