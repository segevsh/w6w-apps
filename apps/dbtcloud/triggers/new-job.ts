import { snapshotList } from "../lib/snapshot.ts";
import jobList from "../actions/job-list.ts";

export default snapshotList<{ projectId?: string }>({
  key: "new-job",
  title: "New Job",
  description: "The run gets each newly created dbt job (system jobs excluded).",
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "string",
    default: "",
    hint: "Only this project (blank = the whole account).",
  }],
  action: jobList,
  rows: "jobs",
  input: (p) => ({ projectId: p.projectId }),
  output: [
    { key: "id", type: "number", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "environment_id", type: "number", label: "Environment ID" },
  ],
  sample: { id: 201, name: "Nightly build", project_id: 101, environment_id: 301 },
});
