import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam } from "../lib/params.ts";

/** `POST /api/contracts/{id}/withdraw` */
interface Input {
  contractId: string;
}

const action: ActionDefinition<Input> = {
  key: "contract-withdraw",
  type: "perform",
  resource: "contract",
  title: "Withdraw Contract",
  description:
    "Withdraw a contract so it can no longer be signed. A signed contract cannot be withdrawn; the contract stays queryable.",
  idempotent: false,
  params: [contractIdParam],
  output: [{ key: "status", type: "string", label: "Vendor status" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(`/contracts/${encodeId(input.contractId)}/withdraw`, {
      method: "POST",
    });
  },
};

export default action;
