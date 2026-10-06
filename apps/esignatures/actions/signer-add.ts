import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient, signerBody } from "../lib/client.ts";
import { contractIdParam, signerFieldParams } from "../lib/params.ts";

/**
 * `POST /api/contracts/{id}/signers` — add a signer. Adding does not send the contract; follow
 * with Resend Sign Request. Response is `{"status":"success"}`.
 */
type Input = { contractId: string } & Record<string, unknown>;

const signerAdd: ActionDefinition<Input> = {
  key: "signer-add",
  type: "perform",
  resource: "signer",
  title: "Add Signer",
  description: "Add a signer to a contract. Does not email the contract to them.",
  idempotent: false,
  params: [contractIdParam, ...signerFieldParams],
  output: [{ key: "status", type: "string", label: "success" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(`/contracts/${encodeId(input.contractId)}/signers`, {
      method: "POST",
      body: signerBody(input),
    });
  },
};

export default signerAdd;
