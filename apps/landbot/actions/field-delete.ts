import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";
import { fieldPath } from "../lib/fields.ts";

/**
 * Delete Customer Field — Delete a custom field from a customer.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  customerId: number;
  fieldName: string;
}

const fieldDelete: ActionDefinition<Input> = {
  key: "field-delete",
  type: "perform",
  resource: "field",
  title: "Delete Customer Field",
  description: "Delete a custom field from a customer.",
  idempotent: true,
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
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(
      `/customers/${encodeId(input.customerId)}/fields/${fieldPath(input.fieldName)}/`,
      { method: "DELETE" },
    );
  },
};

export default fieldDelete;
