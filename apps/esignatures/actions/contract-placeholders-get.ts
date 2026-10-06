import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam } from "../lib/params.ts";

/**
 * `GET /api/contracts/{id}/placeholder_fields` — the values currently assigned. A placeholder
 * filled from another template always reads back as the literal `[template content]`.
 */
interface Input {
  contractId: string;
}

const contractPlaceholdersGet: ActionDefinition<Input> = {
  key: "contract-placeholders-get",
  type: "read",
  resource: "contract",
  title: "Get Contract Placeholder Fields",
  description: "List the placeholder field values currently assigned to a contract.",
  params: [contractIdParam],
  output: [{ key: "placeholderFields", type: "array", label: "Placeholder fields" }],

  async execute(input, ctx) {
    const data = await new ESignaturesClient(ctx).data(
      `/contracts/${encodeId(input.contractId)}/placeholder_fields`,
    );
    return { placeholderFields: Array.isArray(data) ? data : [] };
  },
};

export default contractPlaceholdersGet;
