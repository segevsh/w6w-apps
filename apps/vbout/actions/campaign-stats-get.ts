import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/emailmarketing/stats.json` — Return open, bounce, unsubscribe and click statistics of a campaign.
 */
interface Input {
  id: string;
  type?: string;
}

const campaignStatsGet: ActionDefinition<Input> = {
  key: "campaign-stats-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Stats",
  description: "Return open, bounce, unsubscribe and click statistics of a campaign.",
  params: [
    {
      key: "id",
      label: "Campaign ID",
      type: "string",
      required: true,
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "standard", label: "standard" }, {
        value: "automated",
        label: "automated",
      }],
    },
  ],
  output: [
    { key: "campaign", type: "object", label: "Campaign statistics" },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).get("emailmarketing/stats", {
      id: input.id,
      type: input.type,
    });
  },
};

export default campaignStatsGet;
