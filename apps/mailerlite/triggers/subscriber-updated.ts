import { webhookTrigger } from "../lib/triggers.ts";

/** A MailerLite webhook on `subscriber.updated`. */
export default webhookTrigger({
  key: "subscriber-updated",
  title: "Subscriber Updated",
  description:
    "Fires when a subscriber's fields change or the subscriber confirms their subscription. The run gets the updated subscriber.",
  event: "subscriber.updated",
  sample: {
    event: "subscriber.updated",
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
      event: "subscriber.updated",
      account_id: 1,
    },
  },
});
