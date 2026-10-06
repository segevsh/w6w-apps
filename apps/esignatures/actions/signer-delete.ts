import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam, signerIdParam } from "../lib/params.ts";

/** `POST /api/contracts/{id}/signers/{signerId}/delete` */
interface Input {
  contractId: string;
  signerId: string;
}

const action: ActionDefinition<Input> = {
  key: "signer-delete",
  type: "perform",
  resource: "signer",
  title: "Delete Signer",
  description: "Remove a signer from a contract (queued).",
  idempotent: false,
  params: [contractIdParam, signerIdParam],
  output: [{ key: "status", type: "string", label: "queued" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(
      `/contracts/${encodeId(input.contractId)}/signers/${encodeId(input.signerId)}/delete`,
      { method: "POST" },
    );
  },
};

export default action;
