import { webhookTrigger } from "../lib/triggers.ts";

/** A subscriber unsubscribes from all mailings. */
const subscriberUnsubscribed = webhookTrigger({
  key: "subscriber-unsubscribed",
  title: "Subscriber Unsubscribed",
  description:
    "Fires when a subscriber unsubscribes from all mailings. The run gets the event time, the subscriber's id and email and the full subscriber record.",
  eventName: "subscriber.unsubscribed",
  sample: {
    eventName: "subscriber.unsubscribed",
    eventTime: "2026-11-10T09:30:00.000Z",
    webhookId: "5f8a1c0e9b2d4e6f7a8b9c0d",
    subscriberId: "5f8a1c0e9b2d4e6f7a8b9c01",
    email: "jane@example.com",
    subscriber: {
      id: "5f8a1c0e9b2d4e6f7a8b9c01",
      status: "unsubscribed",
      email: "jane@example.com",
      source: "form_optin",
      first_name: "Jane",
      last_name: "Doe",
      segments: [],
    },
    segment: null,
  },
});

export default subscriberUnsubscribed;
