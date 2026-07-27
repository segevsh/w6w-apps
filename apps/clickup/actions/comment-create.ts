import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  commentOn: "task" | "list" | "view";
  id: string;
  commentText: string;
  assignee?: number;
  notifyAll?: boolean;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Add a comment to a task, list, or view.",
  idempotent: false,
  params: [
    {
      key: "commentOn",
      label: "Comment on",
      type: "select",
      required: true,
      default: "task",
      options: [
        { value: "task", label: "Task" },
        { value: "list", label: "List" },
        { value: "view", label: "View" },
      ],
    },
    {
      key: "id",
      label: "Task / List / View ID",
      type: "string",
      required: true,
      hint: "The ID of the resource selected above.",
    },
    {
      key: "commentText",
      label: "Comment",
      type: "text",
      required: true,
      config: { multiline: true },
    },
    { key: "assignee", label: "Assignee (user ID)", type: "number" },
    { key: "notifyAll", label: "Notify all", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "hist_id", type: "string", label: "History ID" },
  ],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/${input.commentOn}/${encodeURIComponent(input.id)}/comment`,
      {
        method: "POST",
        body: {
          comment_text: input.commentText,
          assignee: input.assignee,
          notify_all: input.notifyAll,
        },
      },
    );
  },
};

export default commentCreate;
