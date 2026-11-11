import { webhookTrigger } from "../lib/triggers.ts";

/** RSVP Created (the `RsvpCreated` webhook event). */
const rsvpCreated = webhookTrigger({
  key: "rsvp-created",
  title: "RSVP Created",
  description:
    "Fires when a member RSVPs to an event. The run gets the event id and time and the payload: the RSVP (id, status), the event and the member.",
  eventTypes: ["RsvpCreated"],
  sample: {
    eventId: "sample-event-id",
    eventType: "RsvpCreated",
    eventTimestamp: "2026-11-10T10:30:00Z",
    payload: {
      id: 6001,
      status: "going",
      event: {
        id: 4321,
        title: "Community call",
        starts_at: "2026-12-01T17:00:00Z",
        space_id: 111,
      },
      member: {
        id: 67890,
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        member_type: "member",
      },
    },
  },
});

export default rsvpCreated;
