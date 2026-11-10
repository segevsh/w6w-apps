import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.spam_reported` (https://developers.mailerlite.com/docs/webhooks.html, verified 2026-11-10). */
export default webhookTrigger({
  key: "subscriber-spam-reported",
  title: "Subscriber Spam Reported",
  description:
    "Fires when a subscriber marks a campaign as spam. The run gets the subscriber (email, status, fields).",
  event: "subscriber.spam_reported",
  sample: {
    event: "subscriber.spam_reported",
    resourceId: "100000000000000000",
    resource: {
      id: "100000000000000000",
      email: "john.doe@example.com",
      status: "active",
      updated_at: "2026-11-10T10:30:29.000000Z",
      event: "subscriber.spam_reported",
      account_id: 1,
    },
  },
});
