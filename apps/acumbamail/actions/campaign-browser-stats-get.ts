import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  campaign_id: number | string;
}

/** `POST /api/1/getCampaignOpenersByBrowser/` */
const campaignBrowserStatsGet: ActionDefinition<Input> = {
  key: "campaign-browser-stats-get",
  type: "read",
  title: "Get Campaign Opens by Browser",
  description: "Openers of a campaign split by browser (limit: 10 requests per minute).",
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
    const result = await call(ctx, "getCampaignOpenersByBrowser", {
      campaign_id: required("campaign_id", input.campaign_id),
    });
    return { result };
  },
};

export default campaignBrowserStatsGet;
