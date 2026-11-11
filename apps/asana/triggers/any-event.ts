import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Asana webhook event you list (for example section.added, story.changed, workspace_membership.added), or on every event a project produces when the list is blank. The run gets the resource type and ID, the action, the parent and who caused it.",
  scope: "any",
  filters: [],
});
