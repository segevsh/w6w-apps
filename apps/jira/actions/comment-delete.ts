import type { ActionDefinition } from "@w6w/types";
import { JiraClient } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  commentId: string;
}

const commentDelete: ActionDefinition<Input> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment from an issue.",
  idempotent: true,
  params: [issueKey, { key: "commentId", label: "Comment ID", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new JiraClient(ctx).request(
      `/issue/${encodeURIComponent(input.issueKey)}/comment/${encodeURIComponent(input.commentId)}`,
      { method: "DELETE" },
    );
  },
};

export default commentDelete;
