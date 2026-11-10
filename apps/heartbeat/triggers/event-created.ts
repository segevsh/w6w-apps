import { webhookTrigger } from "../lib/triggers.ts";

/** An event is created (action `EVENT_CREATE`). */
const eventCreated = webhookTrigger({
  key: "event-created",
  title: "New Event",
  description:
    "Fires when a new event is created in the Heartbeat community (action EVENT_CREATE). The run gets the event id; Get Event returns the details.",
  action: "EVENT_CREATE",
  output: [{ key: "id", type: "string", label: "Event ID" }],
  sample: { action: "EVENT_CREATE", id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601" },
});

export default eventCreated;
