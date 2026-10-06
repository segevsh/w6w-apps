import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";
import { runIdParam } from "../lib/params.ts";

/** `GET /v1/runs/{run_id}` — one run, task (`tsk_…`) or agent (`wr_…`). */
interface Input {
  runId: string;
}

const runGet: ActionDefinition<Input> = {
  key: "run-get",
  type: "read",
  resource: "run",
  title: "Get Run",
  description:
    "Fetch a run's status, output, failure reason, recording and screenshots. Poll until `status` is terminal.",
  params: [runIdParam],
  output: [
    { key: "run_id", type: "string", label: "Run ID" },
    { key: "status", type: "string", label: "Status (created … completed, failed, canceled)" },
    { key: "output", type: "object", label: "Output (extracted data)" },
    { key: "failure_reason", type: "string", label: "Failure reason" },
    { key: "recording_url", type: "string", label: "Recording URL" },
    { key: "screenshot_urls", type: "array", label: "Latest screenshot URLs" },
    { key: "downloaded_files", type: "array", label: "Downloaded files" },
    { key: "step_count", type: "number", label: "Step count" },
    { key: "app_url", type: "string", label: "Skyvern app URL" },
    { key: "run_type", type: "string", label: "Run type" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "finished_at", type: "string", label: "Finished at" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json(`/v1/runs/${encodeURIComponent(input.runId)}`);
  },
};

export default runGet;
