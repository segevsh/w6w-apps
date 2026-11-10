import { eventTypeExtract, eventTypeOutput, eventTypeSample } from "../lib/event-types.ts";
import { resourceTrigger } from "../lib/triggers.ts";

/** an event type is deleted. */
const eventTypeDeleted = resourceTrigger({
  key: "event-type-deleted",
  title: "Event Type Deleted",
  description:
    "Fires when an event type is deleted in Calendly. The run gets the event type's name, slug, scheduling URL, duration and status.",
  event: "event_type.deleted",
  extraOutput: eventTypeOutput,
  extract: eventTypeExtract,
  sample: eventTypeSample("event_type.deleted"),
});

export default eventTypeDeleted;
