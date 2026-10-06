import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  limit?: number;
  offset?: number;
}

const knowledgeBaseList: ActionDefinition<Input> = {
  key: "knowledge-base-list",
  type: "search",
  resource: "knowledge-base",
  title: "List Knowledge Bases",
  description: "List the workspace's knowledge bases.",
  params: [
    limitParam,
    offsetParam,
  ],
  output: [{ key: "items", type: "array", label: "Knowledge bases" }, {
    key: "pagination",
    type: "object",
    label: "Pagination (total_records)",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>("/knowledge_base", {
      query: { limit: input.limit, offset: input.offset },
    });
    return listResult(r, "knowledge_bases");
  },
};

export default knowledgeBaseList;
