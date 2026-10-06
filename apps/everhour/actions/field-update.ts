import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient, toArray, toObject } from "../lib/client.ts";

/**
 * `PUT /fields/{fieldId}` — Update a custom field.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  fieldId: number;
  name: string;
  type: string;
  format?: unknown;
  icon?: string;
  options?: unknown;
}

const fieldUpdate: ActionDefinition<Input> = {
  key: "field-update",
  type: "perform",
  resource: "field",
  title: "Update Field",
  description: "Update a custom field.",
  idempotent: true,
  params: [
    {
      key: "fieldId",
      label: "Field ID",
      type: "number",
      required: true,
      hint: "Numeric custom field id.",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "number", label: "number" }, { value: "text", label: "text" }, {
        value: "select",
        label: "select",
      }, { value: "date", label: "date" }],
    },
    {
      key: "format",
      label: "Format",
      type: "json",
      hint:
        'JSON `{"format": "number"|"currency"|"percent"|"label", "decimals": 2, "label": "US$", "labelAt": "left", "type": "date"|"dob"}`.',
    },
    { key: "icon", label: "Icon", type: "string" },
    {
      key: "options",
      label: "Options",
      type: "json",
      hint: "JSON array of `{name, color}` (up to 10) for a `select` field.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Field type" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/fields/${encodeId(input.fieldId)}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        type: input.type,
        format: toObject(input.format, "format"),
        icon: input.icon,
        options: toArray(input.options, "options"),
      }),
    });
  },
};

export default fieldUpdate;
