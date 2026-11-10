import { webhookTrigger } from "../lib/triggers.ts";

const eventCanceled = webhookTrigger({
  key: "event-canceled",
  title: "Event Canceled",
  type: "event.canceled",
  description:
    "Fires when a SavvyCal event is canceled. The run gets the event id, summary, start and end, cancel reason, scheduling link, organizer, attendees and the full event.",
});

export default eventCanceled;
