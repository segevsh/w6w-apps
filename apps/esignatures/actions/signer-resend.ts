import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam, signerIdParam } from "../lib/params.ts";

/** `POST /api/contracts/{id}/signers/{signerId}/send_contract` */
interface Input {
  contractId: string;
  signerId: string;
}

const action: ActionDefinition<Input> = {
  key: "signer-resend",
  type: "perform",
  resource: "signer",
  title: "Resend Sign Request",
  description: "Re-send the signature request to one signer.",
  idempotent: false,
  params: [contractIdParam, signerIdParam],
  output: [{ key: "status", type: "string", label: "queued" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(
      `/contracts/${encodeId(input.contractId)}/signers/${encodeId(input.signerId)}/send_contract`,
      { method: "POST" },
    );
  },
};

export default action;
