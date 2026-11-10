import { webhookTrigger } from "../lib/triggers.ts";

/** Event Canceled (the `EventCanceled` webhook event). */
const eventCanceled = webhookTrigger({
  key: "event-canceled",
  title: "Event Canceled",
  description:
    "Fires when an event is canceled. The run gets the event id and time and the payload: the event's id, title, start and end time, space and creator.",
  eventTypes: ["EventCanceled"],
  sample: {
    eventId: "sample-event-id",
    eventType: "EventCanceled",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      id: 4321,
      title: "Community call",
      event_type: "online",
      starts_at: "2026-12-01T17:00:00Z",
      ends_at: "2026-12-01T18:00:00Z",
      time_zone: "UTC",
      space_id: 111,
      creator_id: 67890,
      permalink: "https://community.example.com/events/4321",
    },
  },
});

export default eventCanceled;
