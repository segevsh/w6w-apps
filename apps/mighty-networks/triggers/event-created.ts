import { webhookTrigger } from "../lib/triggers.ts";

/** Event Created (the `EventCreated` webhook event). */
const eventCreated = webhookTrigger({
  key: "event-created",
  title: "Event Created",
  description:
    "Fires when an event is scheduled in a space. The run gets the event id and time and the payload: the event's id, title, summary, start and end time, time zone, location, recurrence, space and creator.",
  eventTypes: ["EventCreated"],
  sample: {
    eventId: "sample-event-id",
    eventType: "EventCreated",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      id: 4321,
      title: "Community call",
      summary: "Monthly catch-up",
      event_type: "online",
      starts_at: "2026-12-01T17:00:00Z",
      ends_at: "2026-12-01T18:00:00Z",
      time_zone: "UTC",
      space_id: 111,
      creator_id: 67890,
      rsvp_enabled: true,
      permalink: "https://community.example.com/events/4321",
    },
  },
});

export default eventCreated;
