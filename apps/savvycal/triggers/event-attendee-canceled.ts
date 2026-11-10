import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "event-attendee-canceled",
  title: "Event Attendee Canceled",
  type: "event.attendee.canceled",
  description:
    "Fires when one attendee cancels from a group event. The run gets the event; `data.attendee` is who cancelled.",
});
