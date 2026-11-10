import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "event-attendee-added",
  title: "Event Attendee Added",
  type: "event.attendee.added",
  description:
    "Fires when a new attendee is added to an existing event (a guest, or a new attendee of a group event). The run gets the event; `data.attendee` is the new attendee.",
});
