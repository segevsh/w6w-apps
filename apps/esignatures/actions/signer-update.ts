import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient, signerBody } from "../lib/client.ts";
import { contractIdParam, signerFieldParams, signerIdParam } from "../lib/params.ts";

/**
 * `POST /api/contracts/{id}/signers/{signerId}` — change a signer's contact details. The contract
 * is not re-sent automatically. Setting the same details twice is harmless, so idempotent.
 */
type Input = { contractId: string; signerId: string } & Record<string, unknown>;

const signerUpdate: ActionDefinition<Input> = {
  key: "signer-update",
  type: "perform",
  resource: "signer",
  title: "Update Signer",
  description: "Update a signer's contact details. Does not re-send the contract.",
  idempotent: true,
  params: [contractIdParam, signerIdParam, ...signerFieldParams],
  output: [{ key: "status", type: "string", label: "updated" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(
      `/contracts/${encodeId(input.contractId)}/signers/${encodeId(input.signerId)}`,
      { method: "POST", body: signerBody(input) },
    );
  },
};

export default signerUpdate;
