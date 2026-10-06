import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

const batchCallList: ActionDefinition<Input> = {
  key: "batch-call-list",
  type: "search",
  resource: "batch-call",
  title: "List Batch Calls",
  description: "List batch calls in the workspace.",
  params: [
    limitParam,
    offsetParam,
  ],
  output: [{ key: "items", type: "array", label: "Batches" }, {
    key: "pagination",
    type: "object",
    label: "Pagination",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>("/calls/batch", {
      query: { limit: input.limit, offset: input.offset },
    });
    return listResult(r, "batch_calls");
  },
};

export default batchCallList;
