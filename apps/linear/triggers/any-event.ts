import { anyEventTrigger } from "../lib/triggers.ts";

/** Any Linear data-change event for the chosen resource types. */
const anyEvent = anyEventTrigger({ key: "any-event", title: "Any Event" });

export default anyEvent;
