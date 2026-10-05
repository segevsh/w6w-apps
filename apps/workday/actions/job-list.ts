import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "job-list",
  resource: "job",
  title: "List jobs",
  description:
    "Jobs with job profile, business title, location, worker and supervisory organization. " +
    "Staffing service v7 `GET /jobs`; secured by Worker Position: View.",
  service: "staffing",
  path: "/jobs",
});
