import { eventStreamTrigger } from "../lib/events.ts";

/** Any Event Streams event the sink delivers, optionally filtered by type. */
export default eventStreamTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires for each Twilio Event Streams event your webhook sink receives, optionally only the types you list. The run gets the event and its data.",
});
