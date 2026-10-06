import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, flag, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  jobId?: unknown;
  includeStages?: unknown;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  title: "Get Job",
  description: "Fetch one job by id, optionally with its pipeline stages.",
  params: [
    { key: "jobId", label: "Job ID", type: "number", required: true },
    { key: "includeStages", label: "Include stages", type: "boolean" },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const query = compact({
      "job_id": toInt(input.jobId, "Job ID"),
      "include_stages": flag(input.includeStages),
    }) as Record<string, QueryValue>;
    const res = await call(ctx, "/job", { query });
    return asObject(res);
  },
};

export default jobGet;
