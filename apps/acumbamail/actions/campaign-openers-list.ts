import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  campaign_id: number | string;
  exclude_clickers?: boolean;
  block_index?: number | string;
}

/** `POST /api/1/getCampaignOpeners/` */
const campaignOpenersList: ActionDefinition<Input> = {
  key: "campaign-openers-list",
  type: "search",
  title: "List Campaign Openers",
  description: "Subscribers who opened a campaign, with the date (limit: 10 requests per minute).",
  params: [
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "number",
      required: true,
      hint: "Numeric campaign identifier (from List Campaigns).",
    },
    {
      key: "exclude_clickers",
      label: "Exclude clickers",
      type: "boolean",
      hint:
        'Per the reference this "displays the subscribers who have clicked" - its wording is ambiguous, so it is passed through as 1/0.',
    },
    {
      key: "block_index",
      label: "Block index",
      type: "number",
      hint: "Blocks of 10,000 openers (0 = 1-10,000). Omit to get all openers.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "getCampaignOpeners", {
      campaign_id: required("campaign_id", input.campaign_id),
      exclude_clickers: input.exclude_clickers,
      block_index: input.block_index,
    });
    return { result };
  },
};

export default campaignOpenersList;
