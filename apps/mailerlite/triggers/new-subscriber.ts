import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.created`. */
export default webhookTrigger({
  key: "new-subscriber",
  title: "New Subscriber",
  description:
    "Fires when a subscriber is added to the MailerLite account. The run gets the subscriber (email, status, fields).",
  event: "subscriber.created",
  sample: {
    event: "subscriber.created",
    resourceId: "100000000000000000",
    resource: {
      id: "100000000000000000",
      email: "john.doe@example.com",
      status: "active",
      source: "api",
      fields: { name: "John", last_name: "Doe", company: "Acme" },
      subscribed_at: "2026-11-09T08:26:04.000000Z",
      unsubscribed_at: null,
      created_at: "2026-11-09T08:26:04.000000Z",
      updated_at: "2026-11-09T08:26:04.000000Z",
      event: "subscriber.created",
      account_id: 1,
    },
  },
});
