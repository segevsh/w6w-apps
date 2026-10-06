import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  campaign_id: number | string;
}

/** `POST /api/1/getCampaignClicks/` */
const campaignClicksList: ActionDefinition<Input> = {
  key: "campaign-clicks-list",
  type: "search",
  title: "List Campaign Clickers",
  description:
    "Subscribers who clicked a campaign, with the click date (limit: 10 requests per minute).",
  params: [
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "number",
      required: true,
      hint: "Numeric campaign identifier (from List Campaigns).",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getCampaignClicks", {
      campaign_id: required("campaign_id", input.campaign_id),
    });
    return { result };
  },
};

export default campaignClicksList;
