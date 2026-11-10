import { webhookTrigger } from "../lib/triggers.ts";

/** Event Updated (the `EventUpdated` webhook event). */
const eventUpdated = webhookTrigger({
  key: "event-updated",
  title: "Event Updated",
  description:
    "Fires when an event is updated in a space. The run gets the event id and time and the payload: the event's id, title, summary, start and end time, time zone, location, recurrence, space and creator.",
  eventTypes: ["EventUpdated"],
  sample: {
    eventId: "sample-event-id",
    eventType: "EventUpdated",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      id: 4321,
      title: "Community call (moved)",
      summary: "Monthly catch-up",
      event_type: "online",
      starts_at: "2026-12-02T17:00:00Z",
      ends_at: "2026-12-02T18:00:00Z",
      time_zone: "UTC",
      space_id: 111,
      creator_id: 67890,
      rsvp_enabled: true,
      permalink: "https://community.example.com/events/4321",
    },
  },
});

export default eventUpdated;
