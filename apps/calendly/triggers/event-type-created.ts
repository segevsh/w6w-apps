import { eventTypeExtract, eventTypeOutput, eventTypeSample } from "../lib/event-types.ts";
import { resourceTrigger } from "../lib/triggers.ts";

/** a new event type is created. */
const eventTypeCreated = resourceTrigger({
  key: "event-type-created",
  title: "Event Type Created",
  description:
    "Fires when a new event type is created in Calendly. The run gets the event type's name, slug, scheduling URL, duration and status.",
  event: "event_type.created",
  extraOutput: eventTypeOutput,
  extract: eventTypeExtract,
  sample: eventTypeSample("event_type.created"),
});

export default eventTypeCreated;
