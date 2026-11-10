import { snapshotList } from "../lib/snapshot.ts";
import jobList from "../actions/job-list.ts";

export default snapshotList<{ projectId?: string }>({
  key: "new-or-updated-job",
  title: "New or Updated Job",
  description: "The run gets each dbt job that is created or edited (system jobs excluded).",
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
  stampOf: (i) => String(i.updated_at),
  output: [
    { key: "id", type: "number", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: { id: 201, name: "Nightly build", updated_at: "2026-11-09 09:00:00.000000+00:00" },
});
