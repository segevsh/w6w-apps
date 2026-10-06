import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /v2/proposal-templates/{id}` — Anchor operation `getProposalTemplateV2`. */
interface Input {
  id: string;
}

const proposalTemplateGet: ActionDefinition<Input> = {
  key: "proposal-template-get",
  type: "read",
  resource: "proposal-template",
  title: "Get Proposal Template",
  description:
    "Fetch a proposal template: agreement name, services, packages, payment settings and legal-terms references.",
  params: [
    { key: "id", label: "Proposal template ID", type: "string", required: true },
  ],
  output: [
    { key: "agreementName", type: "string", label: "Agreement name" },
    { key: "agreementSettings", type: "object", label: "Agreement settings" },
    { key: "paymentSettings", type: "object", label: "Payment settings" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/v2/proposal-templates/${encodeId(input.id)}`);
  },
};

export default proposalTemplateGet;
