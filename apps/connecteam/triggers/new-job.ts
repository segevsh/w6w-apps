import { collectPages, snapshotTrigger } from "../lib/triggers.ts";
import jobList from "../actions/job-list.ts";

/**
 * Bounded collection (brief 9.1 c): the company's job (project) list, walked to its end through
 * `limit` (max 500) and `offset` on `GET /jobs/v1/jobs`; deleted jobs are left out
 * (`includeDeleted=false`). https://developer.connecteam.com/openapi/connecteam-api-documentation.json
 * (verified 2026-11-10). The kit refuses more than 5000 rows.
 */
export default snapshotTrigger({
  key: "new-job",
  title: "New Job",
  description: "The run gets each job newly created in the Connecteam account.",
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "code", type: "string", label: "Code" },
    { key: "parentId", type: "string", label: "Parent job ID" },
  ],
  sample: { jobId: "job_7f3a", title: "Warehouse move", code: "WH-1", parentId: null },
  fetchRows: (_params, ctx) =>
    collectPages(500, async (offset, limit) => {
      const out = await jobList.execute({ includeDeleted: false, limit, offset }, ctx) as {
        jobs?: unknown[];
      };
      return out.jobs ?? [];
    }),
  idOf: (row) => (row as { jobId?: unknown }).jobId,
});
