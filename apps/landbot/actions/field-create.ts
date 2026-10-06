import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";
import { fieldBody, fieldPath } from "../lib/fields.ts";

/**
 * Create Customer Field — Create a custom field on a customer.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  fieldName: string;
  type: string;
  value: string;
  extra?: unknown;
}

const fieldCreate: ActionDefinition<Input> = {
  key: "field-create",
  type: "perform",
  resource: "field",
  title: "Create Customer Field",
  description: "Create a custom field on a customer.",
  idempotent: false,
  params: [
    {
      "key": "customerId",
      "label": "Customer ID",
      "type": "number",
      "required": true,
      "hint": "Numeric Landbot customer id (from List Customers).",
    },
    {
      "key": "fieldName",
      "label": "Field name",
      "type": "string",
      "required": true,
      "hint": "Lowercase Latin letters, digits and _ only.",
      "validation": {
        "pattern": "^[a-z0-9_]+$",
      },
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "string",
          "label": "string",
        },
        {
          "value": "integer",
          "label": "integer",
        },
        {
          "value": "float",
          "label": "float",
        },
        {
          "value": "boolean",
          "label": "boolean",
        },
        {
          "value": "date",
          "label": "date",
        },
        {
          "value": "datetime",
          "label": "datetime",
        },
        {
          "value": "object",
          "label": "object",
        },
      ],
    },
    {
      "key": "value",
      "label": "Value",
      "type": "string",
      "required": true,
      "hint":
        "Coerced by type: integer/float become numbers, boolean accepts true/false; everything else is sent as text.",
    },
    {
      "key": "extra",
      "label": "Extra",
      "type": "json",
      "hint": "Optional JSON object of extra data.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Field name" },
    { key: "type", type: "string", label: "Field type" },
    { key: "value", type: "string", label: "Value" },
    { key: "extra", type: "object", label: "Extra data" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).get(
      `/customers/${encodeId(input.customerId)}/fields/${fieldPath(input.fieldName)}/`,
      "field",
      {
        method: "POST",
        body: fieldBody(input),
      },
    );
  },
};

export default fieldCreate;
