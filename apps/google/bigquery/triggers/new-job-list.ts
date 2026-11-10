import { pollFromListAction } from "../../_shared/poll/mod.ts";
import jobList from "../actions/job-list.ts";

export default pollFromListAction({
  key: "new-job-list",
  title: "New Job",
  description: "The run gets each newly created BigQuery job.",
  action: jobList,
  input: () => ({ limit: 100 }),
  items: (result) => Array.isArray(result) ? result : (result as { jobs?: unknown[] }).jobs ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jobReference?: { jobId?: unknown } }).id ??
        (item as { jobReference?: { jobId?: unknown } }).jobReference?.jobId ?? "",
    ),
  output: [{ key: "id", type: "string", label: "Job ID" }],
  sample: { id: "job_123" },
  maxPages: 1,
});
