import { webhookTrigger } from "../lib/triggers.ts";

const eventUnpublished = webhookTrigger({
  key: "event-unpublished",
  title: "Event Unpublished",
  description: "Fires when an event is unpublished. The run gets the event.",
  action: "event.unpublished",
});

export default eventUnpublished;
