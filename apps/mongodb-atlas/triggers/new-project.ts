import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/project-list.ts";

export default snapshotTrigger({
  key: "new-project",
  title: "New Project",
  description:
    "The run gets each project newly visible to the service account, polled from the existing `project-list` action (the whole list, diffed by project id).",
  action,
  listKey: "projects",
  idOf: (item) => item.id,
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "orgId", type: "string", label: "Organization ID" },
  ],
  sample: {
    id: "5f8d0d55b54eff0f2b2c3d54",
    name: "Production",
    orgId: "5f8d0d55b54eff0f2b2c3d53",
  },
});
