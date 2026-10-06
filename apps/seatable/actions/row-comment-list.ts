import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";

interface Input {
  rowId: string;
}

const rowCommentList: ActionDefinition<Input> = {
  key: "row-comment-list",
  type: "read",
  resource: "comment",
  title: "List Row Comments",
  description: "All comments on one row. The answer is a bare array; each comment has an `id`.",
  params: [
    {
      key: "rowId",
      label: "Row ID",
      type: "string",
      required: true,
      hint: "The row's `_id`.",
    },
  ],
  output: [{ key: "comments", type: "array", label: "Comments" }],

  async execute(input, ctx) {
    const comments = await new SeaTableClient(ctx).request<unknown>("/comments/", {
      query: { row_id: input.rowId },
    });
    return { comments: Array.isArray(comments) ? comments : [] };
  },
};

export default rowCommentList;
