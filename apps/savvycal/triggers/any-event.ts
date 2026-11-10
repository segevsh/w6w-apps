import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "any-event",
  title: "Any Event",
  type: "event.created",
  anyOf: true,
  description:
    "Fires on any SavvyCal webhook delivery whose type you list in Events (empty = every type), so attendee reschedules, checkout states and workflow actions are reachable. The run gets the normalized delivery and the full payload in `data`.",
});
