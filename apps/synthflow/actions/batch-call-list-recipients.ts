import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  batch_call_id: string;
  limit?: number;
  offset?: number;
  status?: string;
}

const batchCallListRecipients: ActionDefinition<Input> = {
  key: "batch-call-list-recipients",
  type: "search",
  resource: "batch-call",
  title: "List Batch Call Recipients",
  description: "List a batch's recipients, optionally by dispatch status.",
  params: [
    { key: "batch_call_id", label: "Batch ID", type: "string", required: true },
    limitParam,
    offsetParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "pending", label: "Pending" },
        { value: "claimed", label: "Claimed" },
        { value: "dispatched", label: "Dispatched" },
        { value: "failed", label: "Failed" },
        { value: "canceled", label: "Canceled" },
      ],
    },
  ],
  output: [{ key: "items", type: "array", label: "Recipients" }, {
    key: "pagination",
    type: "object",
    label: "Pagination",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/calls/batch/${encodeURIComponent(input.batch_call_id)}/tasks`,
      { query: { limit: input.limit, offset: input.offset, status: input.status } },
    );
    return listResult(r, "tasks");
  },
};

export default batchCallListRecipients;
