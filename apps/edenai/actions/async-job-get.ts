import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";
import type { UniversalEnvelope } from "../lib/universal.ts";

/**
 * `GET /v3/universal-ai/async/{job_id}`.
 *
 * `status` is `processing`, `success` or `fail` - the vendor's own outcome, distinct from the HTTP
 * status (a failed job is still a 200). This read does not throw on `fail`: the caller is polling,
 * and `done` / `failed` let a workflow branch on it.
 */
interface Input {
  jobId: string;
  compact?: boolean;
}

const asyncJobGet: ActionDefinition<Input> = {
  key: "async-job-get",
  type: "read",
  resource: "async-job",
  title: "Get Async Job",
  description: "Get the status and, once finished, the output of an async Universal AI job.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    {
      key: "compact",
      label: "Compact output",
      type: "boolean",
      hint: "Drop base64 media from the output; useful when the result feeds an LLM.",
    },
  ],
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Status (processing, success or fail)" },
    { key: "done", type: "boolean", label: "Finished (success or fail)" },
    { key: "failed", type: "boolean", label: "Failed" },
    { key: "output", type: "object", label: "Normalized provider output" },
    { key: "error", type: "object", label: "Error details when failed" },
    { key: "provider", type: "string", label: "Provider" },
    { key: "cost", type: "number", label: "Cost in credits (USD)" },
    { key: "feature", type: "string", label: "Feature" },
    { key: "subfeature", type: "string", label: "Subfeature" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<UniversalEnvelope>(
      `/universal-ai/async/${encodeURIComponent(input.jobId)}`,
      { query: { output_format: input.compact ? "compact" : undefined } },
    );
    return {
      jobId: res.public_id ?? input.jobId,
      status: res.status,
      done: res.status === "success" || res.status === "fail",
      failed: res.status === "fail",
      output: res.output ?? undefined,
      error: res.error ?? undefined,
      provider: res.provider,
      cost: res.cost === undefined ? undefined : Number(res.cost),
      feature: res.feature,
      subfeature: res.subfeature,
      createdAt: res.created_at,
    };
  },
};

export default asyncJobGet;
