import type { ActionDefinition } from "@w6w/types";
import { SynthflowClient } from "../lib/client.ts";

interface Input {
  batch_call_id: string;
}

const batchCallGet: ActionDefinition<Input> = {
  key: "batch-call-get",
  type: "read",
  resource: "batch-call",
  title: "Get Batch Call",
  description: "Read a batch's status and dispatch counters.",
  params: [
    {
      key: "batch_call_id",
      label: "Batch ID",
      type: "string",
      required: true,
      hint: "The UUID returned by Create Batch Call.",
    },
  ],
  output: [
    { key: "batch_call_id", type: "string", label: "Batch ID" },
    {
      key: "status",
      type: "string",
      label: "Status (scheduled, in_progress, paused, completed, canceled)",
    },
    { key: "dispatched_count", type: "number", label: "Dispatched" },
    { key: "failed_count", type: "number", label: "Failed" },
    { key: "pending_count", type: "number", label: "Pending" },
  ],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/calls/batch/${encodeURIComponent(input.batch_call_id)}`,
    );
  },
};

export default batchCallGet;
