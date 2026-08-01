import type { ActionDefinition } from "@w6w/types";
import { ActiveCampaignClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

const getCampaign: ActionDefinition<Input> = {
  key: "get-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Retrieve a single email campaign by ID.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],
  output: [
    { key: "campaign", type: "object", label: "Campaign" },
  ],

  execute(input, ctx) {
    return new ActiveCampaignClient(ctx).request(`/campaigns/${input.campaignId}`);
  },
};

export default getCampaign;
