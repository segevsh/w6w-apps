import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  since?: number;
}

interface Usage {
  quota_usage?: number;
  config?: { quota_total?: number; quota_duration?: number };
}

/**
 * How much of the daily publishing allowance an account has used —
 * `GET /{ig-user-id}/content_publishing_limit?fields=quota_usage,config`. Returns
 * `{ data: [{ quota_usage, config: { quota_total, quota_duration } }] }`.
 *
 * Meta's own pages disagree on the ceiling: the Content Publishing guide says 100
 * API-published posts per rolling 24h, the endpoint reference and its sample say
 * `quota_total: 50`. Read `config.quota_total` from the response rather than
 * hard-coding either number.
 */
const getPublishingLimit: ActionDefinition<Input, InstagramListResponse<Usage>> = {
  key: "get-publishing-limit",
  type: "read",
  resource: "account",
  title: "Get Publishing Limit",
  description: "Check how many posts the account has published via the API in the last 24 hours.",
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "since",
      label: "Since (Unix timestamp)",
      type: "number",
      hint: "Count publishes since this time; must be no older than 24 hours.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Usage (quota_usage, config.quota_total)" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Usage>>(
      `/${seg(input.igUserId)}/content_publishing_limit`,
      { params: { fields: "quota_usage,config", since: input.since } },
    );
  },
};

export default getPublishingLimit;
