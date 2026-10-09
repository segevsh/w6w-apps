import { webhookTrigger } from "../lib/triggers.ts";

/** Any chosen set of Eventbrite actions on one webhook; the run's `action` says which fired. */
const activity = webhookTrigger({
  key: "activity",
  title: "Organization Activity",
  description:
    "Fires on any of the Eventbrite actions you choose (orders, attendees, events, ticket classes, organizers, venues). The run gets the action and the record it concerns.",
});

export default activity;
