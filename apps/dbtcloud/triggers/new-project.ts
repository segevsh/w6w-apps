import { snapshotList } from "../lib/snapshot.ts";
import projectList from "../actions/project-list.ts";

export default snapshotList({
  key: "new-project",
  title: "New Project",
  description: "The run gets each newly created dbt project.",
  action: projectList,
  rows: "projects",
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "account_id", type: "number", label: "Account ID" },
  ],
  sample: { id: 101, name: "analytics", account_id: 42 },
});
