import type { ActionDefinition } from "@w6w/types";
import { encodeId, MaintainXClient } from "../lib/client.ts";
import { idParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/workorders/{id}/comments` */
interface Input {
  workOrderId: number;
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const workorderCommentList: ActionDefinition<Input> = {
  key: "workorder-comment-list",
  type: "read",
  resource: "workorder",
  title: "List Work Order Comments",
  description: "List the comments on a work order.",
  params: [idParam("workOrderId", "Work order ID"), ...paginationParams, organizationIdParam],
  output: [
    { key: "comments", type: "array", label: "Comments (id, authorId, content, createdAt)" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list(
      `/workorders/${encodeId(input.workOrderId)}/comments`,
      "comments",
      { limit: input.limit, cursor: input.cursor },
      input.organizationId,
    );
  },
};

export default workorderCommentList;
