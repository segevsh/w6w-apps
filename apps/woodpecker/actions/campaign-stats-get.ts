import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, listOf, V1 } from "../lib/client.ts";
import { campaignId } from "../lib/params.ts";

type Input = {
  campaign_id: string;
};

const campaignStatsGet: ActionDefinition<Input> = {
  key: "campaign-stats-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Statistics",
  description:
    "Fetch one campaign with its statistics: prospects, sent, opened, replied, bounced and interest levels (legacy v1 endpoint).",
  params: [
    campaignId,
  ],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    {
      key: "stats",
      type: "object",
      label:
        "prospects, sent, delivery, opened, clicked, replied, bounced, interested, ... counters",
    },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V1, "/campaign_list", {
      query: { id: encodeId(input.campaign_id) },
    });
    const campaign = listOf(body).items[0];
    if (!campaign) throw new Error(`Woodpecker returned no campaign for id ${input.campaign_id}`);
    return campaign as Record<string, unknown>;
  },
};

export default campaignStatsGet;
