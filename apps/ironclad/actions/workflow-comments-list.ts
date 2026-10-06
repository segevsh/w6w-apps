import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { pageParams, workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: string;
  page?: number;
  pageSize?: number;
}

const workflowCommentsList: ActionDefinition<Input> = {
  key: "workflow-comments-list",
  type: "read",
  resource: "workflow",
  title: "List Workflow Comments",
  description: "List the comments on a workflow's activity feed.",
  params: [workflowIdParam, ...pageParams],
  output: [{ key: "list", type: "array", label: "Comments on this page" }, {
    key: "count",
    type: "number",
    label: "Total comments",
  }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/comments`, {
      query: { page: input.page, pageSize: input.pageSize },
    });
  },
};

export default workflowCommentsList;
