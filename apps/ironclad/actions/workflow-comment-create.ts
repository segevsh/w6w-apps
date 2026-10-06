import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, IroncladClient } from "../lib/client.ts";
import { workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: string;
  comment: string;
  addUsersToWorkflow?: boolean;
  repliedToActivityFeedMessageId?: string;
}

const workflowCommentCreate: ActionDefinition<Input> = {
  key: "workflow-comment-create",
  type: "perform",
  resource: "workflow",
  title: "Add Workflow Comment",
  description:
    "Post a comment on a workflow's activity feed, optionally as a reply. Needs the `public.records.createComments` scope (Ironclad gates this route with a records-prefixed scope).",
  idempotent: false,
  params: [
    workflowIdParam,
    { key: "comment", label: "Comment", type: "text", required: true },
    {
      key: "addUsersToWorkflow",
      label: "Add mentioned users to the workflow",
      type: "boolean",
      default: false,
    },
    {
      key: "repliedToActivityFeedMessageId",
      label: "Reply to message ID",
      type: "string",
      hint: "The id of a comment from List Workflow Comments, to post as a reply.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Comment ID" }, {
    key: "commentMessage",
    type: "string",
    label: "Comment text",
  }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/comments`, {
      method: "POST",
      body: compact({
        comment: input.comment,
        addUsersToWorkflow: input.addUsersToWorkflow,
        repliedToActivityFeedMessageId: input.repliedToActivityFeedMessageId,
      }),
    });
  },
};

export default workflowCommentCreate;
