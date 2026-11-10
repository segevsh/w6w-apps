import { snapshotList } from "../lib/snapshot.ts";
import projectList from "../actions/project-list.ts";

export default snapshotList({
  key: "new-or-updated-project",
  title: "New or Updated Project",
  description: "The run gets each dbt project that is created or edited.",
  action: projectList,
  rows: "projects",
  stampOf: (i) => String(i.updated_at),
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: { id: 101, name: "analytics", updated_at: "2026-11-09 09:00:00.000000+00:00" },
});
