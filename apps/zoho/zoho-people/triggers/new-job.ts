import type { ActionDefinition } from "@w6w/types";
import { SNAPSHOT_LIMIT, snapshotTrigger } from "../lib/triggers.ts";
import jobsList from "../actions/jobs-list.ts";

// Zoho People Time Tracker `GET /people/api/timetracker/getjobs` takes no sort or created filter,
// and the wrapped action caps `limit` at 200 (the per-endpoint doc page is not publicly served;
// API overview https://www.zoho.com/people/api/overview.html, checked 2026-11-10). A company has a
// few dozen jobs, so each check reads the jobs assigned to the chosen user (`all` by default) in one
// request and diffs the ids (snapshot, brief 9.1 c).
export default snapshotTrigger<{ assignedTo?: string }>({
  key: "new-job",
  title: "New Time Tracker Job",
  description: "The run gets each newly created Time Tracker job.",
  params: [{
    key: "assignedTo",
    label: "Assigned to",
    type: "string",
    default: "all",
    hint: "`all`, an email, an Employee ID or an erecno.",
  }],
  async read(params, ctx) {
    const res = await (jobsList as unknown as ActionDefinition).execute({
      assignedTo: params.assignedTo || "all",
      sIndex: 0,
      limit: SNAPSHOT_LIMIT,
    }, ctx) as { result?: Array<Record<string, unknown>> | null };
    return Array.isArray(res.result) ? res.result : [];
  },
  idOf: (r) => String(r.jobId ?? ""),
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "jobName", type: "string", label: "Job name" },
  ],
  sample: { jobId: "759415000000654321", jobName: "Build" },
});
