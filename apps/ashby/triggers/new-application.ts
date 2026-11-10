import applicationList from "../actions/application-list.ts";
import { sinceTrigger, stamp } from "../lib/triggers.ts";

/** Emits each application created since the previous successful check (`application.list` with `createdAfter`; Lead records are not applications and are left out). Brief 9.1 (b), 9.8, 9.9. */
export default sinceTrigger({
  key: "new-application",
  title: "New Application",
  description:
    "Emits each application created since the previous successful check (`application.list` with `createdAfter`; Lead records are not applications and are left out).",
  action: applicationList,
  list: "applications",
  tsOf: stamp("createdAt"),
  extra: (p) => ({ status: "Active,Hired,Archived", jobId: p.jobId }),
  params: [{
    key: "jobId",
    label: "Job ID",
    type: "string",
    default: "",
    hint: "Only applications for this job. Leave blank for every job.",
  }],
  output: [
    { key: "id", type: "string", label: "Application ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "candidate", type: "object", label: "Candidate" },
    { key: "job", type: "object", label: "Job" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "app-101",
    status: "Active",
    candidate: { id: "cand-101", name: "Pat Example" },
    job: { id: "job-101", title: "Engineer" },
    createdAt: "2026-11-10T12:00:00.000Z",
  },
});
