import { webhookTrigger } from "../lib/triggers.ts";

/**
 * Any Flodesk event. Flodesk publishes exactly three (`subscriber.created`,
 * `subscriber.unsubscribed`, `subscriber.added_to_segment`); the `events` param picks the ones the
 * webhook is registered for (empty = all three).
 * https://developers.flodesk.com/ (verified 2026-11-10)
 */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the Flodesk events you choose (subscriber.created, subscriber.unsubscribed, subscriber.added_to_segment; all three when empty). The run gets the event name and time, the subscriber's id and email, the full subscriber record and, for segment events, the segment.",
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
      first_name: "Jane",
      last_name: "Doe",
    },
    segment: { id: "5f8a1c0e9b2d4e6f7a8b9c02", name: "Newsletter" },
  },
});

export default anyEvent;
