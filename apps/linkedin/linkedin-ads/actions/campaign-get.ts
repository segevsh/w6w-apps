import type { ActionDefinition } from "@w6w/types";
import { bareId, LinkedInAdsClient } from "../lib/client.ts";
import { accountIdParam, campaignIdParam } from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignId: string;
}

/** `GET /rest/adAccounts/{accountId}/adCampaigns/{id}` — a single, non-batch read. */
const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Fetch one Campaign by ID.",
  params: [accountIdParam, campaignIdParam],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type" },
    { key: "costType", type: "string", label: "Cost type" },
    { key: "servingStatuses", type: "array", label: "Serving statuses" },
    { key: "targetingCriteria", type: "object", label: "Targeting criteria" },
  ],

  execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    return client.request(
      `/rest/adAccounts/${bareId(input.accountId)}/adCampaigns/${bareId(input.campaignId)}`,
    );
  },
};

export default campaignGet;
