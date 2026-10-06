import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { campaignId } from "../lib/params.ts";

type Input = {
  campaign_id: string;
};

const campaignStop: ActionDefinition<Input> = {
  key: "campaign-stop",
  type: "perform",
  resource: "campaign",
  title: "Stop Campaign",
  description: "Stop a campaign.",
  idempotent: true,
  params: [
    campaignId,
  ],
  output: [
    { key: "campaign_id", type: "string", label: "Campaign ID" },
    { key: "requested", type: "string", label: "The state change that was accepted" },
  ],

  async execute(input, ctx) {
    await call(ctx, "POST", V2, `/campaigns/${encodeId(input.campaign_id)}/stop`);
    return { campaign_id: input.campaign_id, requested: "stop" };
  },
};

export default campaignStop;
