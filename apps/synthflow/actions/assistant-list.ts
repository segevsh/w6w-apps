import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

const assistantList: ActionDefinition<Input> = {
  key: "assistant-list",
  type: "search",
  resource: "agent",
  title: "List Agents",
  description: "List the agents (assistants) in the workspace.",
  params: [
    limitParam,
    offsetParam,
  ],
  output: [{ key: "items", type: "array", label: "Agents" }, {
    key: "pagination",
    type: "object",
    label: "Pagination (total_records, limit, offset)",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>("/assistants/", {
      query: { limit: input.limit, offset: input.offset },
    });
    return listResult(r, "assistants");
  },
};

export default assistantList;
