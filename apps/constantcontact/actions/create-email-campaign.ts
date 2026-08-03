import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  name: string;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  subject: string;
  htmlContent: string;
  preheader?: string;
  physicalAddressInFooter?: Record<string, unknown>;
  emailCampaignActivities?: Array<Record<string, unknown>>;
}

/**
 * `POST /v3/emails` — creates a **draft** campaign plus its `primary_email`
 * and `permalink` activities. Nothing is sent; scheduling is a separate call
 * against the returned `campaign_activity_id`.
 *
 * Constraints the API enforces and this app cannot check for you:
 *
 *   - `name` must be unique in the account, 80 characters max.
 *   - `from_email` must already be a **verified** address on the account.
 *   - `html_content` must contain the `[[trackingImage]]` token or Constant
 *     Contact reports nothing about the send. `format_type` is `5` (the
 *     current custom-code format); a legacy V7 body is auto-converted.
 *
 * The wire shape nests everything under a one-element
 * `email_campaign_activities` array. Rather than make every caller hand-build
 * that, the six properties the API marks required are lifted to top-level
 * params and assembled here. The raw array stays available as an escape hatch
 * and wins when supplied.
 *
 * `idempotent: false` — the unique-name rule means a retry answers 409.
 */
const createEmailCampaign: ActionDefinition<Input> = {
  key: "create-email-campaign",
  type: "perform",
  resource: "campaign",
  title: "Create Email Campaign",
  description:
    "Create a draft email campaign with its primary_email activity. Nothing is sent until it is scheduled.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Campaign name",
      type: "string",
      required: true,
      validation: { maxLength: 80 },
      hint: "Internal only — contacts never see it. Must be unique in the account.",
    },
    {
      key: "fromName",
      label: "From name",
      type: "string",
      required: true,
      validation: { maxLength: 100 },
    },
    {
      key: "fromEmail",
      label: "From address",
      type: "string",
      required: true,
      validation: { maxLength: 80 },
      hint: "Must already be verified on the Constant Contact account.",
    },
    {
      key: "replyToEmail",
      label: "Reply-to address",
      type: "string",
      required: true,
      validation: { maxLength: 80 },
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "htmlContent",
      label: "HTML content",
      type: "code",
      required: true,
      validation: { maxLength: 150000 },
      hint:
        "Custom-code HTML. Must include the `[[trackingImage]]` token or the campaign reports no opens.",
    },
    {
      key: "preheader",
      label: "Preheader",
      type: "string",
      validation: { maxLength: 200 },
      hint: "Preview text shown after the subject in most inboxes.",
    },
    {
      key: "physicalAddressInFooter",
      label: "Physical address in footer",
      type: "json",
      hint:
        'JSON object: `{"address_line1": "…", "city": "…", "country_code": "…", "organization_name": "…", …}`. Omit to use the account default.',
    },
    {
      key: "emailCampaignActivities",
      label: "Campaign activities (raw)",
      type: "json",
      hint: "Escape hatch: the raw `email_campaign_activities` array. Overrides every field above.",
    },
  ],
  output: [
    { key: "campaign_id", type: "string", label: "Campaign ID" },
    { key: "current_status", type: "string", label: "Status (Draft)" },
    { key: "campaign_activities", type: "array", label: "Activities (id + role)" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);

    let activities = input.emailCampaignActivities;
    if (!activities) {
      const activity: Record<string, unknown> = {
        format_type: 5,
        from_name: input.fromName,
        from_email: input.fromEmail,
        reply_to_email: input.replyToEmail,
        subject: input.subject,
        html_content: input.htmlContent,
      };
      if (input.preheader !== undefined) activity.preheader = input.preheader;
      if (input.physicalAddressInFooter) {
        activity.physical_address_in_footer = input.physicalAddressInFooter;
      }
      activities = [activity];
    }

    return client.request("/emails", {
      method: "POST",
      body: { name: input.name, email_campaign_activities: activities },
    });
  },
};

export default createEmailCampaign;
