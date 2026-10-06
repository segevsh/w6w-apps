import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";

/** `POST /v1/agents/runs/{workflow_run_id}/retry` — retry an agent run (a `wr_…` id). */
interface Input {
  runId: string;
}

const runRetry: ActionDefinition<Input> = {
  key: "run-retry",
  type: "perform",
  resource: "run",
  title: "Retry Agent Run",
  description: "Retry a finished agent run. Returns the run record for the retry.",
  idempotent: false,
  params: [
    {
      key: "runId",
      label: "Agent run ID",
      type: "string",
      required: true,
      hint: "An agent run id (`wr_…`). Task runs (`tsk_…`) cannot be retried here.",
    },
  ],
  output: [
    { key: "run_id", type: "string", label: "Run ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "attempt", type: "number", label: "Attempt number" },
    { key: "app_url", type: "string", label: "Skyvern app URL" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json(
      `/v1/agents/runs/${encodeURIComponent(input.runId)}/retry`,
      { method: "POST" },
    );
  },
};

export default runRetry;
