import type { ActionDefinition } from "@w6w/types";
import { encodeId, MaintainXClient } from "../lib/client.ts";
import { idParam, organizationIdParam } from "../lib/params.ts";

/** `POST /v1/workorders/{id}/comments` — answers 201 `{ id }`. */
interface Input {
  workOrderId: number;
  content: string;
  organizationId?: number;
}

const workorderCommentAdd: ActionDefinition<Input> = {
  key: "workorder-comment-add",
  type: "perform",
  resource: "workorder",
  title: "Add Work Order Comment",
  description: "Post a comment on a work order.",
  // No idempotency key exists: a retry posts the comment twice.
  idempotent: false,
  params: [
    idParam("workOrderId", "Work order ID"),
    { key: "content", label: "Comment", type: "text", required: true },
    organizationIdParam,
  ],
  output: [{ key: "id", type: "number", label: "New comment id" }],

  execute(input, ctx) {
    return new MaintainXClient(ctx).request(`/workorders/${encodeId(input.workOrderId)}/comments`, {
      method: "POST",
      body: { content: input.content },
      organizationId: input.organizationId,
    });
  },
};

export default workorderCommentAdd;
