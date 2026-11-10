import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "event-requested",
  title: "Event Requested",
  type: "event.requested",
  description:
    "Fires when someone books an event on a link that requires approval; the event is awaiting the organizer's decision. The run gets the event.",
});
