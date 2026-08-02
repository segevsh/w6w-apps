import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  adAccountId: string;
  fields?: string;
  limit?: number;
  cursor?: string;
}

interface CampaignSummary {
  id: string;
  name?: string;
  status?: string;
  objective?: string;
  effective_status?: string;
  created_time?: string;
}

/**
 * List an ad account's campaigns — `GET /{ad-account-id}/campaigns`. This is
 * a deliberately narrow, read-only slice of the Marketing API (campaign
 * listing only, no ad set/ad/creative management, no spend or bidding
 * writes) — enough to inventory what's running without this app growing into
 * a full Marketing API client. Requires `ads_read` and an ad account id in
 * Facebook's `act_<id>` form (not the bare numeric id).
 */
const listAdCampaigns: ActionDefinition<Input, FacebookListResponse<CampaignSummary>> = {
  key: "list-ad-campaigns",
  type: "read",
  resource: "ad-campaign",
  title: "List Ad Campaigns",
  description: "List campaigns in an ad account (read-only).",
  params: [
    {
      key: "adAccountId",
      label: "Ad Account ID",
      type: "string",
      required: true,
      hint: "Must be prefixed, e.g. act_1234567890.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "id,name,status,objective,effective_status,created_time",
      hint: "Comma-separated Graph API field list.",
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Facebook `after` cursor for pagination.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Campaigns" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<CampaignSummary>>(
      `/${input.adAccountId}/campaigns`,
      {
        params: {
          fields: input.fields || "id,name,status,objective,effective_status,created_time",
          limit: input.limit ?? 25,
          after: input.cursor,
        },
      },
    );
  },
};

export default listAdCampaigns;
