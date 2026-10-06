import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /proposals/{id}` — Anchor operation `getProposal`. */
interface Input {
  id: string;
}

const proposalGet: ActionDefinition<Input> = {
  key: "proposal-get",
  type: "read",
  resource: "proposal",
  title: "Get Proposal",
  description: "Fetch one proposal in full, including client and service-provider details.",
  params: [
    { key: "id", label: "Proposal ID", type: "string", required: true },
  ],
  output: [
    { key: "agreementName", type: "string", label: "Agreement name" },
    { key: "client", type: "object", label: "Client" },
    { key: "agreementSettings", type: "object", label: "Agreement settings" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/proposals/${encodeId(input.id)}`);
  },
};

export default proposalGet;
