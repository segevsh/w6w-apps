import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam } from "../lib/params.ts";

/** `POST /api/contracts/{id}/send_draft` */
interface Input {
  contractId: string;
}

const action: ActionDefinition<Input> = {
  key: "contract-send-draft",
  type: "perform",
  resource: "contract",
  title: "Send Draft Contract",
  description: "Send a contract that is in draft status to its signers.",
  idempotent: false,
  params: [contractIdParam],
  output: [{ key: "status", type: "string", label: "Vendor status" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(
      `/contracts/${encodeId(input.contractId)}/send_draft`,
      {
        method: "POST",
      },
    );
  },
};

export default action;
