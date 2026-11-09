import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "project-created",
  title: "Project Created",
  description:
    "Fires when a project is created in a Toggl Track workspace. The run gets the project and who created it.",
  entity: "project",
  action: "created",
});
