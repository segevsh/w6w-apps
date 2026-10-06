import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { campaignId } from "../lib/params.ts";

type Input = {
  campaign_id: string;
};

const campaignDelete: ActionDefinition<Input> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description: "Delete a campaign. Refused while the campaign is part of a workflow.",
  idempotent: true,
  params: [
    campaignId,
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when accepted" },
    { key: "campaign_id", type: "string", label: "Campaign ID" },
  ],

  async execute(input, ctx) {
    await call(ctx, "DELETE", V2, `/campaigns/${encodeId(input.campaign_id)}`);
    return { deleted: true, campaign_id: input.campaign_id };
  },
};

export default campaignDelete;
