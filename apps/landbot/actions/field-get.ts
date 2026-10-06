import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";
import { fieldPath } from "../lib/fields.ts";

/**
 * Get Customer Field — Read one custom field of a customer.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  fieldName: string;
}

const fieldGet: ActionDefinition<Input> = {
  key: "field-get",
  type: "read",
  resource: "field",
  title: "Get Customer Field",
  description: "Read one custom field of a customer.",
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
    );
  },
};

export default fieldGet;
