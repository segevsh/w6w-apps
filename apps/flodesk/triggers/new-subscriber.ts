import { webhookTrigger } from "../lib/triggers.ts";

/** A subscriber is created in the account. */
const newSubscriber = webhookTrigger({
  key: "new-subscriber",
  title: "New Subscriber",
  description:
    "Fires when a subscriber is created in the Flodesk account. The run gets the event time, the subscriber's id and email and the full subscriber record.",
  eventName: "subscriber.created",
  sample: {
    eventName: "subscriber.created",
    eventTime: "2026-11-10T09:30:00.000Z",
    webhookId: "5f8a1c0e9b2d4e6f7a8b9c0d",
    subscriberId: "5f8a1c0e9b2d4e6f7a8b9c01",
    email: "jane@example.com",
    subscriber: {
      id: "5f8a1c0e9b2d4e6f7a8b9c01",
      status: "active",
      email: "jane@example.com",
      source: "form_optin",
      first_name: "Jane",
      last_name: "Doe",
      segments: [],
    },
    segment: null,
  },
});

export default newSubscriber;
