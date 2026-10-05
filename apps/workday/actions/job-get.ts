import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "job-get",
  resource: "job",
  title: "Get a job",
  description: "One job by ID. Staffing service v7 `GET /jobs/{ID}`.",
  service: "staffing",
  path: "/jobs/{ID}",
  idKey: "jobId",
  idLabel: "Job ID",
  idHint: "A 32-character Workday ID or a reference ID. Take the `id` from a Jobs list.",
});
