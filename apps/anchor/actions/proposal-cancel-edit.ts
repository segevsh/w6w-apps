import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `POST /v2/proposals/{id}/cancel-edit` — Anchor operation `cancelProposalEdit`. */
interface Input {
  id: string;
}

const proposalCancelEdit: ActionDefinition<Input> = {
  key: "proposal-cancel-edit",
  type: "perform",
  resource: "proposal",
  title: "Cancel Proposal Edit",
  description:
    "Discard the linked draft's pending edits and restore the proposal. Only valid after Withdraw Proposal For Editing.",
  idempotent: false,
  params: [
    { key: "id", label: "Proposal ID", type: "string", required: true },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Anchor accepted the request" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", `/v2/proposals/${encodeId(input.id)}/cancel-edit`);
  },
};

export default proposalCancelEdit;
