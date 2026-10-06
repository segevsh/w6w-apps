import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/conversation_messages/get`
 *
 * List the messages in a conversation.
 */
interface Input {
  conversationId: number;
  limit?: number;
  fromObjIndex?: number;
  toObjIndex?: number;
  orderBy?: string;
  asIds?: boolean;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List the messages in a conversation.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum items to return (Twist default 20, maximum 500).",
    },
    { key: "fromObjIndex", label: "From object index", type: "number" },
    { key: "toObjIndex", label: "To object index", type: "number" },
    {
      key: "orderBy",
      label: "Order",
      type: "select",
      hint: "`desc` (default) or `asc`.",
      options: [{ value: "desc", label: "desc" }, { value: "asc", label: "asc" }],
    },
    {
      key: "asIds",
      label: "Ids only",
      type: "boolean",
      hint: "Return only ids instead of full objects.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/conversation_messages/get",
      params: {
        "conversation_id": input.conversationId,
        "limit": input.limit,
        "from_obj_index": input.fromObjIndex,
        "to_obj_index": input.toObjIndex,
        "order_by": input.orderBy,
        "as_ids": input.asIds,
      },
    });
  },
};

export default messageList;
