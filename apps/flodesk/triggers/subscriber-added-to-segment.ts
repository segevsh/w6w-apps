import { webhookTrigger } from "../lib/triggers.ts";

/** A subscriber is added to a segment. */
const subscriberAddedToSegment = webhookTrigger({
  key: "subscriber-added-to-segment",
  title: "Subscriber Added to Segment",
  description:
    "Fires when a subscriber is added to a segment. The run gets the event time, the subscriber's id and email, the full subscriber record and the segment.",
  eventName: "subscriber.added_to_segment",
  sample: {
    eventName: "subscriber.added_to_segment",
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
    segment: { id: "5f8a1c0e9b2d4e6f7a8b9c02", name: "Newsletter" },
  },
});

export default subscriberAddedToSegment;
