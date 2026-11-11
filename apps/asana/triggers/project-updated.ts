import { resourceTrigger } from "../lib/triggers.ts";

export default resourceTrigger({
  key: "project-updated",
  title: "Project Updated",
  description:
    "Fires when a project in an Asana workspace is changed (renamed, archived, recoloured, owner changed). The run gets the project ID, the changed field and who changed it.",
  scope: "workspace",
  filters: [{ resource_type: "project", action: "changed" }],
  sample: {
    event: "project.changed",
    action: "changed",
    resourceId: "1200000000000005",
    resourceType: "project",
    resourceSubtype: "default_project",
    parentId: null,
    parentType: null,
    field: "name",
    change: { field: "name", action: "changed" },
  },
});
