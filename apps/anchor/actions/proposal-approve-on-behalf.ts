import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `POST /proposals/{id}/approve/vendor` — Anchor operation `approveExistingProposalOnBehalf`. */
interface Input {
  id: string;
}

const proposalApproveOnBehalf: ActionDefinition<Input> = {
  key: "proposal-approve-on-behalf",
  type: "perform",
  resource: "proposal",
  title: "Approve Proposal On Behalf Of Client",
  description:
    "Approve a sent proposal as the service provider, turning it into an agreement. Irreversible.",
  idempotent: false,
  params: [
    { key: "id", label: "Proposal ID", type: "string", required: true },
  ],
  output: [
    { key: "value", type: "string", label: "Anchor response" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request(
      "POST",
      `/proposals/${encodeId(input.id)}/approve/vendor`,
      {
        body: {},
      },
    );
  },
};

export default proposalApproveOnBehalf;
