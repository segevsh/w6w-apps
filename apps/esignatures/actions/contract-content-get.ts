import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { contractIdParam } from "../lib/params.ts";

/** `GET /api/contracts/{id}/content` — the contract's content as markdown. */
interface Input {
  contractId: string;
}

const action: ActionDefinition<Input> = {
  key: "contract-content-get",
  type: "read",
  resource: "contract",
  title: "Get Contract Content",
  description: "Fetch the contract's content as extended markdown.",
  params: [contractIdParam],
  output: [
    { key: "contract_id", type: "string", label: "Contract ID" },
    { key: "markdown", type: "string", label: "Content as markdown" },
  ],

  async execute(input, ctx) {
    return await new ESignaturesClient(ctx).data(
      `/contracts/${encodeId(input.contractId)}/content`,
    );
  },
};

export default action;
