import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { campaignId } from "../lib/params.ts";

type Input = {
  campaign_id: string;
};

const campaignPause: ActionDefinition<Input> = {
  key: "campaign-pause",
  type: "perform",
  resource: "campaign",
  title: "Pause Campaign",
  description: "Pause a running campaign; it can be run again later.",
  idempotent: true,
  params: [
    campaignId,
  ],
  output: [
    { key: "campaign_id", type: "string", label: "Campaign ID" },
    { key: "requested", type: "string", label: "The state change that was accepted" },
  ],

  async execute(input, ctx) {
    await call(ctx, "POST", V2, `/campaigns/${encodeId(input.campaign_id)}/pause`);
    return { campaign_id: input.campaign_id, requested: "pause" };
  },
};

export default campaignPause;
