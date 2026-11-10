import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.bounced` (https://developers.mailerlite.com/docs/webhooks.html, verified 2026-11-10). */
export default webhookTrigger({
  key: "subscriber-bounced",
  title: "Subscriber Bounced",
  description:
    "Fires when a subscriber's email address bounces. The run gets the subscriber (email, status, fields).",
  event: "subscriber.bounced",
  sample: {
    event: "subscriber.bounced",
    resourceId: "100000000000000000",
    resource: {
      id: "100000000000000000",
      email: "john.doe@example.com",
      status: "active",
      updated_at: "2026-11-10T10:30:29.000000Z",
      event: "subscriber.bounced",
      account_id: 1,
    },
  },
});
