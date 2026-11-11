import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any ClickUp webhook event you list, or on every event when the list is blank (tasks, lists, folders, Spaces, Goals and Targets). The run gets the event name, the ids it concerns and the history items.",
  events: [],
  any: true,
});
