import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.unsubscribed`. */
export default webhookTrigger({
  key: "subscriber-unsubscribed",
  title: "Subscriber Unsubscribed",
  description:
    "Fires when a subscriber becomes unsubscribed. The run gets the subscriber with its new status.",
  event: "subscriber.unsubscribed",
  sample: {
    event: "subscriber.unsubscribed",
    resourceId: "100000000000000000",
    resource: {
      id: "100000000000000000",
      email: "john.doe@example.com",
      status: "unsubscribed",
      source: "api",
      fields: { name: "John", last_name: "Doe", company: "Acme" },
      subscribed_at: "2026-11-09T08:26:04.000000Z",
      unsubscribed_at: "2026-11-09T09:00:00.000000Z",
      created_at: "2026-11-09T08:26:04.000000Z",
      updated_at: "2026-11-09T08:26:04.000000Z",
      event: "subscriber.unsubscribed",
      account_id: 1,
    },
  },
});
