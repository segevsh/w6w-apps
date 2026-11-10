import jobList from "../actions/job-list.ts";
import { sinceTrigger, stamp } from "../lib/triggers.ts";

/** Emits each job created since the previous successful check (`job.list` with `createdAfter`, every status). Brief 9.1 (b), 9.8, 9.9. */
export default sinceTrigger({
  key: "new-job",
  title: "New Job",
  description:
    "Emits each job created since the previous successful check (`job.list` with `createdAfter`, every status).",
  action: jobList,
  list: "jobs",
  tsOf: stamp("createdAt"),
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "job-101",
    title: "Engineer",
    status: "Open",
    createdAt: "2026-11-10T12:00:00.000Z",
  },
});
