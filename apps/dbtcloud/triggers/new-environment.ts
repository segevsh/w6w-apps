import { snapshotList } from "../lib/snapshot.ts";
import environmentList from "../actions/environment-list.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

export default snapshotList<{ projectId: string }>({
  key: "new-environment",
  title: "New Environment",
  description: "The run gets each newly created environment in the chosen project.",
  params: [PROJECT_PARAM],
  action: environmentList,
  rows: "environments",
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "number", label: "Environment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "deployment_type", type: "string", label: "Deployment type" },
  ],
  sample: { id: 301, name: "Production", project_id: 101, deployment_type: "production" },
});
