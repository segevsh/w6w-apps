import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  dealId: string;
}

const getDeal: ActionDefinition<Input> = {
  key: "get-deal",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Retrieve a single deal by ID.",
  params: [
    { key: "dealId", label: "Deal ID", type: "string", required: true },
  ],
  output: [
    { key: "deal", type: "object", label: "Deal" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request(`/deals/${input.dealId}`);
  },
};

export default getDeal;
