import type { ActionDefinition } from "@w6w/types";
import { asJson, encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam, placeholderFieldsParam } from "../lib/params.ts";

/**
 * `POST /api/contracts/{id}/placeholder_fields` — set placeholder values on an unsigned contract.
 * Only the keys sent are changed. The reference's JSON schema wraps them as
 * `{"placeholder_fields": [...]}` (its curl example shows a bare object); this sends the schema form.
 * Assigning the same values twice is a no-op, so idempotent.
 */
interface Input {
  contractId: string;
  placeholderFields: unknown;
}

const contractPlaceholdersUpdate: ActionDefinition<Input> = {
  key: "contract-placeholders-update",
  type: "perform",
  resource: "contract",
  title: "Update Contract Placeholder Fields",
  description: "Set placeholder field values on an unsigned contract.",
  idempotent: true,
  params: [contractIdParam, { ...placeholderFieldsParam, required: true }],
  output: [{ key: "status", type: "string", label: "updated" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(
      `/contracts/${encodeId(input.contractId)}/placeholder_fields`,
      {
        method: "POST",
        body: { placeholder_fields: asJson(input.placeholderFields, "placeholderFields") },
      },
    );
  },
};

export default contractPlaceholdersUpdate;
