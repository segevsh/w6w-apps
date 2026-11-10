import { anyEventTrigger } from "../lib/triggers.ts";

/** Exported so the tests can rebuild the trigger with their own key pair. */
export const spec = {
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Wise event you choose that names your profile (transfers, balances, profile state, hold-limit breaches, account-details payments, SWIFT). Leave Events empty for all of them. The run gets the event type, the delivery and subscription ids and the full event data.",
};

const trigger = anyEventTrigger(spec);

export default trigger;
