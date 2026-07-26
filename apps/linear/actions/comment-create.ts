import type { ActionDefinition } from "@w6w/types";
import { LinearClient } from "../lib/client.ts";

interface Input {
  issueId: string;
  body: string;
}

const MUTATION = `
  mutation CommentCreate($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment { id body url createdAt user { id name } }
    }
  }
`;

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a comment on an issue.",
  idempotent: false,
  params: [
    { key: "issueId", label: "Issue ID", type: "string", required: true },
    {
      key: "body",
      label: "Comment",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Markdown.",
    },
  ],
  output: [
    { key: "commentCreate.success", type: "boolean", label: "Created" },
    { key: "commentCreate.comment.id", type: "string", label: "Comment ID" },
    { key: "commentCreate.comment.url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new LinearClient(ctx).query(MUTATION, {
      input: { issueId: input.issueId, body: input.body },
    });
  },
};

export default commentCreate;
