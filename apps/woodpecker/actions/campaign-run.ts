import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, V2 } from "../lib/client.ts";
import { campaignId } from "../lib/params.ts";

type Input = {
  campaign_id: string;
};

const campaignRun: ActionDefinition<Input> = {
  key: "campaign-run",
  type: "perform",
  resource: "campaign",
  title: "Run Campaign",
  description: "Start a campaign that is a draft, paused or stopped.",
  idempotent: true,
  params: [
    campaignId,
  ],
  output: [
    { key: "campaign_id", type: "string", label: "Campaign ID" },
    { key: "requested", type: "string", label: "The state change that was accepted" },
  ],

  async execute(input, ctx) {
    await call(ctx, "POST", V2, `/campaigns/${encodeId(input.campaign_id)}/run`);
    return { campaign_id: input.campaign_id, requested: "run" };
  },
};

export default campaignRun;
