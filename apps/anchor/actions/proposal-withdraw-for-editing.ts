import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `POST /v2/proposals/{id}/withdraw-for-editing` — Anchor operation `withdrawProposalForEditing`. */
interface Input {
  id: string;
}

const proposalWithdrawForEditing: ActionDefinition<Input> = {
  key: "proposal-withdraw-for-editing",
  type: "perform",
  resource: "proposal",
  title: "Withdraw Proposal For Editing",
  description:
    "Withdraw a published proposal so its linked draft becomes editable. Finish with Republish Proposal or Cancel Proposal Edit.",
  idempotent: false,
  params: [
    { key: "id", label: "Proposal ID", type: "string", required: true },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Anchor accepted the request" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request(
      "POST",
      `/v2/proposals/${encodeId(input.id)}/withdraw-for-editing`,
    );
  },
};

export default proposalWithdrawForEditing;
