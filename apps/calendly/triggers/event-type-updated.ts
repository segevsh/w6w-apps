import { eventTypeExtract, eventTypeOutput, eventTypeSample } from "../lib/event-types.ts";
import { resourceTrigger } from "../lib/triggers.ts";

/** an event type is changed. */
const eventTypeUpdated = resourceTrigger({
  key: "event-type-updated",
  title: "Event Type Updated",
  description:
    "Fires when an event type is changed in Calendly. The run gets the event type's name, slug, scheduling URL, duration and status.",
  event: "event_type.updated",
  extraOutput: eventTypeOutput,
  extract: eventTypeExtract,
  sample: eventTypeSample("event_type.updated"),
});

export default eventTypeUpdated;
