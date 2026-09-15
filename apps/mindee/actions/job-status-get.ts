import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

interface Input {
  jobId: string;
}

/**
 * `GET /v2/jobs/{job_id}` — poll the status of any previously enqueued job,
 * regardless of which of the five products enqueued it.
 *
 * Always sent with `?redirect=false`: without it, once `status` is
 * `Processed` the vendor answers **HTTP 302** with a `Location` header
 * pointing at the result, rather than **200** with a `JobResponse` body. This
 * app's client sends every request with `redirect: "manual"`, so a 302 here
 * would otherwise surface as an opaque non-2xx response instead of the `Job`
 * a poll loop needs to read `status` from. `redirect=false` makes the server
 * always answer 200 with the `Job`.
 *
 * `job.status` is one of `Processing` | `Failed` | `Processed`. Once
 * `Processed`, use the matching `*-result-get` action with this same `job.id`
 * (or `job.resultUrl` directly).
 */
const jobStatusGet: ActionDefinition<Input> = {
  key: "job-status-get",
  type: "read",
  resource: "job",
  title: "Get Job Status",
  description: "Poll the status of an inference job enqueued by any product.",
  params: [jobIdParam],
  output: [
    { key: "job", type: "object", label: "Job" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(`/v2/jobs/${encodeURIComponent(input.jobId)}`, {
      query: { redirect: false },
    });
  },
};

export default jobStatusGet;
