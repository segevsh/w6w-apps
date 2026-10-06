import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, IroncladClient } from "../lib/client.ts";
import { recordIdParam } from "../lib/params.ts";

interface Input {
  recordId: string;
  name?: string;
  type?: string;
  addProperties?: unknown;
  removeProperties?: unknown;
  addLinks?: unknown;
  removeLinks?: unknown;
  setParent?: unknown;
  removeParent?: boolean;
  addChildren?: unknown;
  removeChildren?: unknown;
}

const recordUpdate: ActionDefinition<Input> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description:
    "Change a record's name, type, properties, links or parent/child relationships. Only the changes you name are applied; everything else is left alone.",
  idempotent: true,
  params: [
    recordIdParam,
    { key: "name", label: "New name", type: "string" },
    { key: "type", label: "New record type", type: "string" },
    {
      key: "addProperties",
      label: "Add or change properties",
      type: "json",
      hint: 'Keyed by property id, each {"type": "...", "value": ...}.',
    },
    {
      key: "removeProperties",
      label: "Remove properties",
      type: "json",
      hint: 'A list of property ids, e.g. ["counterpartyAddress"].',
    },
    { key: "addLinks", label: "Add links", type: "json", hint: 'List of {"recordId": "..."}.' },
    {
      key: "removeLinks",
      label: "Remove links",
      type: "json",
      hint: 'List of {"recordId": "..."}.',
    },
    {
      key: "setParent",
      label: "Set parent",
      type: "json",
      hint: 'Optional {"recordId": "...", "parentLinkType": "amendment" | "obligation"}.',
    },
    { key: "removeParent", label: "Remove parent", type: "boolean", default: false },
    {
      key: "addChildren",
      label: "Add children",
      type: "json",
      hint: 'List of {"recordId": "..."}.',
    },
    {
      key: "removeChildren",
      label: "Remove children",
      type: "json",
      hint: 'List of {"recordId": "..."}.',
    },
  ],
  output: [{ key: "id", type: "string", label: "Record ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "properties", type: "object", label: "Properties after the update" }],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      type: input.type,
      addProperties: asOptionalJson(input.addProperties, "addProperties"),
      removeProperties: asOptionalJson(input.removeProperties, "removeProperties"),
      addLinks: asOptionalJson(input.addLinks, "addLinks"),
      removeLinks: asOptionalJson(input.removeLinks, "removeLinks"),
      setParent: asOptionalJson(input.setParent, "setParent"),
      removeParent: input.removeParent ? true : undefined,
      addChildren: asOptionalJson(input.addChildren, "addChildren"),
      removeChildren: asOptionalJson(input.removeChildren, "removeChildren"),
    });
    if (Object.keys(body).length === 0) throw new Error("name at least one change to make");
    return new IroncladClient(ctx).json(`/records/${encodeId(input.recordId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default recordUpdate;
