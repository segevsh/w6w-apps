import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  commentsOn: "task" | "list" | "view";
  id: string;
  start?: number;
  startId?: string;
}

const commentGetMany: ActionDefinition<Input> = {
  key: "comment-get-many",
  type: "read",
  resource: "comment",
  title: "Get Many Comments",
  description: "List the comments on a task, list, or view (most recent first).",
  params: [
    {
      key: "commentsOn",
      label: "Comments on",
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
      key: "start",
      label: "Start (epoch ms)",
      type: "number",
      hint: "Page from before this Unix-ms timestamp; pair with Start ID.",
    },
    { key: "startId", label: "Start comment ID", type: "string" },
  ],
  output: [{ key: "comments", type: "array", label: "Comments" }],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/${input.commentsOn}/${encodeURIComponent(input.id)}/comment`,
      { query: { start: input.start, start_id: input.startId } },
    );
  },
};

export default commentGetMany;
