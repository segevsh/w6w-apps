import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /v2/proposal-drafts/{id}` — Anchor operation `getProposalDraftV2`. */
interface Input {
  id: string;
}

const proposalDraftGet: ActionDefinition<Input> = {
  key: "proposal-draft-get",
  type: "read",
  resource: "proposal-draft",
  title: "Get Proposal Draft",
  description:
    "Fetch one proposal draft in full: services, billing configuration, payment settings and legal terms.",
  params: [
    { key: "id", label: "Draft ID", type: "string", required: true },
  ],
  output: [
    { key: "agreementName", type: "string", label: "Agreement name" },
    { key: "contactId", type: "string", label: "Client contact ID" },
    { key: "agreementSettings", type: "object", label: "Agreement settings" },
    { key: "paymentSettings", type: "object", label: "Payment settings" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/v2/proposal-drafts/${encodeId(input.id)}`);
  },
};

export default proposalDraftGet;
