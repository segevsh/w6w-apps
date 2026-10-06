import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  userId?: string;
}

const conversationClose: ActionDefinition<Input> = {
  key: "conversation-close",
  type: "perform",
  resource: "conversation",
  title: "Close Conversation",
  description: "Mark a conversation as closed.",
  idempotent: true,
  params: [
    conversationIdParam,
    {
      key: "userId",
      label: "Acting agent id",
      type: "string",
      hint: "Optional agent/admin UUID to record as the one who closed it.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Dixa answered 204" },
    { key: "conversationId", type: "string", label: "The conversation id" },
  ],

  async execute(input, ctx) {
    const id = conversationId(input.conversationId);
    const userId = input.userId?.trim();
    await new DixaClient(ctx).json(`/conversations/${id}/close`, {
      method: "PUT",
      body: userId ? { userId } : {},
    });
    return { ok: true, conversationId: id };
  },
};

export default conversationClose;
