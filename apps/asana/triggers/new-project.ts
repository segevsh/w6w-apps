import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "new-project",
  title: "New Project",
  description:
    "Fires when a project is created in an Asana workspace. The run gets the project ID, who created it and when.",
  scope: "workspace",
  filters: [{ resource_type: "project", action: "added" }],
  sample: {
    event: "project.added",
    resourceId: "1200000000000005",
    resourceType: "project",
    resourceSubtype: "default_project",
    parentId: "1200000000000006",
    parentType: "workspace",
  },
});
