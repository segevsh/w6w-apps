import { webhookTrigger } from "../lib/triggers.ts";

const eventRescheduled = webhookTrigger({
  key: "event-rescheduled",
  title: "Event Rescheduled",
  type: "event.rescheduled",
  description:
    "Fires when a SavvyCal event is rescheduled. The run gets the event id, new start and end, reschedule reason, scheduling link, organizer, attendees and the full event.",
});

export default eventRescheduled;
