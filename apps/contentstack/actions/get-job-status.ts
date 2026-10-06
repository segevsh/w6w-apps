import type { ActionDefinition } from "@w6w/types";
import { call, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/bulk/jobs/{jobId}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-job-status",
  type: "read",
  resource: "bulk",
  title: "Get Job Status",
  description: "Progress of a bulk publish or unpublish job.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      required: true,
      hint: "The job_id a bulk action returned.",
    },
  ],
  output: [
    { key: "job", type: "object", label: "Job status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = need("jobId", str(p.jobId));
    ctx.log("info", "Contentstack Get Job Status", { jobId });
    return await call(ctx, "GET", `/bulk/jobs/${seg(jobId)}`, { headers: { api_version: "3.2" } });
  },
};

export default action;
