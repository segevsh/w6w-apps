import { webhookTrigger } from "../lib/triggers.ts";

/** Any Network event the webhook is set up to send (members, posts, events, purchases, ...). */
const networkEvent = webhookTrigger({
  key: "network-event",
  title: "Network Event",
  description:
    "Fires on any event the Mighty Networks webhook sends (member, post, comment, event, RSVP, plan and course activity), optionally narrowed to a list of event names. The run gets the event id, type and time and the full payload.",
  eventTypes: [],
  sample: {
    eventId: "sample-event-id",
    eventType: "MemberPurchased",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: { member: { id: 67890, email: "ada@example.com" }, plan_id: 333 },
  },
});

export default networkEvent;
