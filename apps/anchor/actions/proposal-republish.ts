import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `POST /v2/proposals/{id}/republish` — Anchor operation `republishProposal`. */
interface Input {
  id: string;
}

const proposalRepublish: ActionDefinition<Input> = {
  key: "proposal-republish",
  type: "perform",
  resource: "proposal",
  title: "Republish Proposal",
  description:
    "Apply the linked draft's edits and re-send the proposal. Only valid after Withdraw Proposal For Editing.",
  idempotent: false,
  params: [
    { key: "id", label: "Proposal ID", type: "string", required: true },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Anchor accepted the request" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", `/v2/proposals/${encodeId(input.id)}/republish`);
  },
};

export default proposalRepublish;
