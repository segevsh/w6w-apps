import type { ActionDefinition } from "@w6w/types";
import { SynthflowClient } from "../lib/client.ts";

interface Input {
  batch_call_id: string;
}

const batchCallPause: ActionDefinition<Input> = {
  key: "batch-call-pause",
  type: "perform",
  resource: "batch-call",
  title: "Pause Batch Call",
  description:
    "Suspend dialing; queued recipients stay queued. Allowed while scheduled or in progress.",
  idempotent: true,
  params: [
    { key: "batch_call_id", label: "Batch ID", type: "string", required: true },
  ],
  output: [{ key: "batch_call_id", type: "string", label: "Batch ID" }, {
    key: "status",
    type: "string",
    label: "Status",
  }, { key: "pending_count", type: "number", label: "Pending" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/calls/batch/${encodeURIComponent(input.batch_call_id)}/pause`,
      { method: "POST" },
    );
  },
};

export default batchCallPause;
