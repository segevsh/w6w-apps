import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "event-changed",
  title: "Event Changed",
  type: "event.changed",
  description:
    "Fires any time an event is updated. The run gets the updated event; `data.previous_attributes` holds what it was before.",
});
