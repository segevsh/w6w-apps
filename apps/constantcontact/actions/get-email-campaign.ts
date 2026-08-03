import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
}

/**
 * `GET /v3/emails/{campaign_id}` — a campaign plus its `campaign_activities`.
 *
 * That array is the reason to call this rather than reading the collection: it
 * pairs each `campaign_activity_id` with a `role` of `primary_email`,
 * `permalink` or `resend`. Every content, preview, test-send and scheduling
 * endpoint addresses the *activity*, not the campaign, and `primary_email` is
 * almost always the one you want.
 */
const getEmailCampaign: ActionDefinition<Input> = {
  key: "get-email-campaign",
  type: "read",
  resource: "campaign",
  title: "Get Email Campaign",
  description:
    "Fetch a campaign with its campaign_activities — the id/role pairs every content and scheduling endpoint needs.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
  ],
  output: [
    { key: "campaign_id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "current_status", type: "string", label: "Status" },
    { key: "campaign_activities", type: "array", label: "Activities (id + role)" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    return client.request(`/emails/${encodeURIComponent(input.campaignId)}`);
  },
};

export default getEmailCampaign;
