import type { ActionDefinition } from "@w6w/types";
import { SNAPSHOT_LIMIT, snapshotTrigger } from "../lib/triggers.ts";
import projectsList from "../actions/projects-list.ts";

// Zoho People Time Tracker `GET /people/api/timetracker/getprojects` takes no sort or created
// filter, and the wrapped action caps `limit` at 200 (the per-endpoint doc page is not publicly
// served; API overview https://www.zoho.com/people/api/overview.html, checked 2026-11-10). A
// company has a few dozen time-tracker projects, so each check reads them in one request for every
// user (`assignedTo=all`) and diffs the ids (snapshot, brief 9.1 c).
export default snapshotTrigger<Record<string, never>>({
  key: "new-project",
  title: "New Time Tracker Project",
  description: "The run gets each newly created Time Tracker project.",
  async read(_params, ctx) {
    const res = await (projectsList as unknown as ActionDefinition).execute({
      assignedTo: "all",
      sIndex: 0,
      limit: SNAPSHOT_LIMIT,
    }, ctx) as { result?: Array<Record<string, unknown>> | null };
    return Array.isArray(res.result) ? res.result : [];
  },
  idOf: (r) => String(r.projectId ?? ""),
  output: [
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "projectName", type: "string", label: "Project name" },
  ],
  sample: { projectId: "759415000000123456", projectName: "Website redesign" },
});
