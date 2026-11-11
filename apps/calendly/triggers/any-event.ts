import { anyEventTrigger } from "../lib/triggers.ts";

/** Any Calendly event, filtered by the `events` param. */
const anyEvent = anyEventTrigger();

export default anyEvent;
