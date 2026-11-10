import type { ActionDefinition } from "@w6w/types";
import jobList from "../actions/job-list.ts";
import { type Job, jobsSince, jobTriggerParams, sinceFilterTrigger } from "../lib/triggers.ts";

// Phrase documents `updated_since` on GET /projects/{project_id}/jobs but no sort order, so this
// is a since-filter poll (brief 9.1b); the created_at test keeps edited old jobs out.
export default sinceFilterTrigger<Job, { projectId: string }>({
  key: "new-job",
  title: "New Job",
  description: "The run gets each newly created job in the chosen project.",
  params: jobTriggerParams,
  load: jobsSince(jobList as unknown as ActionDefinition),
  idOf: (job) => String(job.id ?? ""),
  keep: (job, from) =>
    typeof job.created_at === "string" && Date.parse(job.created_at) >= Date.parse(from),
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: "job-2", name: "Release 4.2", state: "draft", created_at: "2026-11-10T09:00:00Z" },
});
