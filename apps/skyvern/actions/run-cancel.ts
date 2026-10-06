import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";
import { runIdParam } from "../lib/params.ts";

/** `POST /v1/runs/{run_id}/cancel` — cancel a task or agent run. The 200 body is unspecified. */
interface Input {
  runId: string;
}

const runCancel: ActionDefinition<Input> = {
  key: "run-cancel",
  type: "perform",
  resource: "run",
  title: "Cancel Run",
  description: "Cancel a task or agent run that is still in progress.",
  idempotent: true,
  params: [runIdParam],
  output: [
    { key: "success", type: "boolean", label: "Cancel request accepted" },
    { key: "run_id", type: "string", label: "Run ID" },
  ],

  async execute(input, ctx) {
    await new SkyvernClient(ctx).json(`/v1/runs/${encodeURIComponent(input.runId)}/cancel`, {
      method: "POST",
    });
    return { success: true, run_id: input.runId };
  },
};

export default runCancel;
