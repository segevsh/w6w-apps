import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "job-get",
  resource: "job",
  path: "/jobs",
  idKey: "jobId",
  idLabel: "Job ID",
  title: "Get Job",
  description: "Fetch one job (project) by id.",
});
