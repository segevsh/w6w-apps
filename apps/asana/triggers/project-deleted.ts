import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "project-deleted",
  title: "Project Deleted",
  description:
    "Fires when a project in an Asana workspace is deleted. The run gets the project ID, who deleted it and when.",
  scope: "workspace",
  filters: [{ resource_type: "project", action: "deleted" }],
  sample: {
    event: "project.deleted",
    action: "deleted",
    resourceId: "1200000000000005",
    resourceType: "project",
    resourceSubtype: "default_project",
    parentId: null,
    parentType: null,
  },
});
