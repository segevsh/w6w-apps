import type { ActionDefinition } from "@w6w/types";
import jobList from "../actions/job-list.ts";
import { type Job, jobsSince, jobTriggerParams, sinceFilterTrigger } from "../lib/triggers.ts";

// `updated_since` is documented on GET /projects/{project_id}/jobs; the id carries the update stamp
// so an edit is a new event (brief 9.2).
export default sinceFilterTrigger<Job, { projectId: string }>({
  key: "new-or-updated-job",
  title: "New or Updated Job",
  description: "The run gets each job in the chosen project that was created or updated.",
  params: jobTriggerParams,
  load: jobsSince(jobList as unknown as ActionDefinition),
  idOf: (job) => `${job.id ?? ""}:${job.updated_at ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "job-2",
    name: "Release 4.2",
    state: "in_progress",
    updated_at: "2026-11-10T09:30:00Z",
  },
});
