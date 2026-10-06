import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /fields/{fieldId}` — Delete a custom field.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  fieldId: number;
}

const fieldDelete: ActionDefinition<Input> = {
  key: "field-delete",
  type: "perform",
  resource: "field",
  title: "Delete Field",
  description: "Delete a custom field.",
  idempotent: true,
  params: [
    {
      key: "fieldId",
      label: "Field ID",
      type: "number",
      required: true,
      hint: "Numeric custom field id.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/fields/${encodeId(input.fieldId)}`, { method: "DELETE" });
  },
};

export default fieldDelete;
