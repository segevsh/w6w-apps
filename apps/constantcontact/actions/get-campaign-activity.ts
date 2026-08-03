import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  campaignActivityId: string;
  include?: string;
}

/**
 * `GET /v3/emails/activities/{campaign_activity_id}` — the actual email: its
 * from/reply-to/subject metadata, its styling, and the lists or segments it is
 * addressed to.
 *
 * The heavy parts are opt-in through `include`, and the default response omits
 * all of them: `html_content`, `physical_address_in_footer`, `permalink_url`
 * and `document_properties`. Ask only for what you need — `html_content` alone
 * can run to 150 kB.
 *
 * Activities with a `REMOVED` status cannot be fetched at all; the API answers
 * 404.
 *
 * Get the id from Get Email Campaign's `campaign_activities` array — the
 * `primary_email` role is the sent email.
 */
const getCampaignActivity: ActionDefinition<Input> = {
  key: "get-campaign-activity",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Activity",
  description:
    "Fetch a single email campaign activity. HTML content and footer details are opt-in via `include`.",
  params: [
    {
      key: "campaignActivityId",
      label: "Campaign activity ID",
      type: "string",
      required: true,
      hint: "From Get Email Campaign's `campaign_activities` array.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated: `html_content`, `physical_address_in_footer`, `permalink_url`, `document_properties`. All omitted by default.",
    },
  ],
  output: [
    { key: "campaign_activity_id", type: "string", label: "Campaign activity ID" },
    { key: "role", type: "string", label: "Role" },
    { key: "current_status", type: "string", label: "Status" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    return client.request(
      `/emails/activities/${encodeURIComponent(input.campaignActivityId)}`,
      { query: { include: input.include } },
    );
  },
};

export default getCampaignActivity;
