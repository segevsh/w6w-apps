import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "job-list",
  resource: "job",
  path: "/jobs",
  title: "List Jobs",
  description: "List jobs (projects).",
});
