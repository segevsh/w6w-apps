import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  userId?: string;
}

const conversationReopen: ActionDefinition<Input> = {
  key: "conversation-reopen",
  type: "perform",
  resource: "conversation",
  title: "Reopen Conversation",
  description: "Reopen a closed conversation.",
  idempotent: true,
  params: [
    conversationIdParam,
    {
      key: "userId",
      label: "Acting agent id",
      type: "string",
      hint: "Optional agent/admin UUID to record as the one who reopened it.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Dixa answered 204" },
    { key: "conversationId", type: "string", label: "The conversation id" },
  ],

  async execute(input, ctx) {
    const id = conversationId(input.conversationId);
    const userId = input.userId?.trim();
    await new DixaClient(ctx).json(`/conversations/${id}/reopen`, {
      method: "PUT",
      body: userId ? { userId } : {},
    });
    return { ok: true, conversationId: id };
  },
};

export default conversationReopen;
