import { extractAction } from "../lib/extract.ts";

/** `GET /v3/job` — job posting page (beta) */
export default extractAction({
  key: "extract-job",
  api: "job",
  title: "Extract Job Post (beta)",
  description:
    "Extract a job posting: employer, location, requirements, skills and tasks. Beta API. 1 credit per page.",
});
