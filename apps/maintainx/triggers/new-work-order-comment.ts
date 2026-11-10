import type { ActionDefinition } from "@w6w/types";
import { cursorSnapshot } from "../lib/triggers.ts";
import workorderCommentList from "../actions/workorder-comment-list.ts";

/** `GET /v1/workorders/{id}/comments` has no sort, so one work order's comments are read through `nextCursor` and diffed by id. */
export default cursorSnapshot({
  key: "new-work-order-comment",
  title: "New Work Order Comment",
  description: "The run gets each new comment on one work order: id, author, text and time.",
  action: workorderCommentList as unknown as ActionDefinition,
  listKey: "comments",
  params: [
    {
      key: "workOrderId",
      label: "Work order ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The work order to watch for comments.",
    },
  ],
  input: (params) => ({ workOrderId: params.workOrderId }),
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "authorId", type: "number", label: "Author user ID" },
    { key: "content", type: "string", label: "Comment text" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: 77,
    authorId: 9,
    content: "Replaced the belt.",
    createdAt: "2026-11-10T09:00:00.000Z",
  },
});
