import type { ActionDefinition } from "@w6w/types";
import { bareId, LinkedInAdsClient } from "../lib/client.ts";
import { accountIdParam, campaignGroupIdParam } from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignGroupId: string;
}

/** `GET /rest/adAccounts/{accountId}/adCampaignGroups/{id}` — a single, non-batch read. */
const campaignGroupGet: ActionDefinition<Input> = {
  key: "campaign-group-get",
  type: "read",
  resource: "campaign-group",
  title: "Get Campaign Group",
  description: "Fetch one Campaign Group by ID.",
  params: [accountIdParam, campaignGroupIdParam],
  output: [
    { key: "id", type: "number", label: "Campaign group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "servingStatuses", type: "array", label: "Serving statuses" },
    { key: "runSchedule", type: "object", label: "Run schedule (start/end, epoch ms)" },
    { key: "totalBudget", type: "object", label: "Total budget" },
  ],

  execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    return client.request(
      `/rest/adAccounts/${bareId(input.accountId)}/adCampaignGroups/${
        bareId(input.campaignGroupId)
      }`,
    );
  },
};

export default campaignGroupGet;
