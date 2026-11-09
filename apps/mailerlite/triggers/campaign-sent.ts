import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `campaign.sent`. */
export default webhookTrigger({
  key: "campaign-sent",
  title: "Campaign Sent",
  description:
    "Fires when a campaign is sent. The run gets the campaign (name, recipient count, preview link).",
  event: "campaign.sent",
  sample: {
    event: "campaign.sent",
    resourceId: "100000000000000001",
    resource: {
      id: "100000000000000001",
      name: "November newsletter",
      total_recipients: 1000,
      preview_url: "https://example.com/preview/emails/100000000000000001",
      date: "2026-11-09T09:00:00.000000Z",
      event: "campaign.sent",
      account_id: 1,
    },
  },
});
