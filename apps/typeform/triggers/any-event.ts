import { eventTrigger } from "../lib/triggers.ts";

/** Any Typeform webhook event, picked by the `events` param. */
const anyEvent = eventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires for the Typeform webhook events you choose (submitted responses, started-but-unsubmitted responses; both when left empty). The run gets the event type, the response token, hidden fields and the answers.",
  events: null,
});

export default anyEvent;
