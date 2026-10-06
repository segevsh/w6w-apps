import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient, encodeId } from "../lib/client.ts";

/**
 * Delete Person Field — `DELETE /v1/fields/{fieldName}`. Verified against the OpenAPI document
 * (`DeleteField`, 204), fetched 2026-10-06.
 */
interface Input {
  fieldName: string;
}

const fieldDelete: ActionDefinition<Input> = {
  key: "field-delete",
  type: "perform",
  resource: "fields",
  title: "Delete Person Field",
  description: "Delete a custom person field by its name. The values people hold in it are lost.",
  idempotent: true,
  params: [
    {
      key: "fieldName",
      label: "Field name",
      type: "string",
      required: true,
      hint: "The field's `name` from List Person Fields.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Encharge accepted the request" }],

  async execute(input, ctx) {
    const name = (input.fieldName ?? "").trim();
    if (!name) throw new Error("`fieldName` is required.");
    return await new EnchargeClient(ctx).request("DELETE", `/fields/${encodeId(name)}`);
  },
};

export default fieldDelete;
