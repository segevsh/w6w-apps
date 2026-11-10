import { webhookTrigger } from "../lib/triggers.ts";

const eventCreated = webhookTrigger({
  key: "event-created",
  title: "Event Created",
  type: "event.created",
  description:
    "Fires when someone books a new event on one of your scheduling links (or an organizer approves a pending one). The run gets the event id, summary, start and end, duration, scheduling link, organizer, attendees and the full event.",
});

export default eventCreated;
