import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  campaign_id: number | string;
}

/** `POST /api/1/getCampaignBasicInformation/` */
const campaignInfoGet: ActionDefinition<Input> = {
  key: "campaign-info-get",
  type: "read",
  title: "Get Campaign",
  description: "Basic information about a campaign (limit: 10 requests per minute).",
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
    const result = await call(ctx, "getCampaignBasicInformation", {
      campaign_id: required("campaign_id", input.campaign_id),
    });
    return { result };
  },
};

export default campaignInfoGet;
