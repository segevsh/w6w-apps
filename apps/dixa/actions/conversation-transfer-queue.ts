import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam, requireText } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  queueId: string;
  userId?: string;
}

const conversationTransferQueue: ActionDefinition<Input> = {
  key: "conversation-transfer-queue",
  type: "perform",
  resource: "conversation",
  title: "Transfer Conversation to Queue",
  description: "Move a conversation to another queue.",
  idempotent: true,
  params: [
    conversationIdParam,
    {
      key: "queueId",
      label: "Queue id",
      type: "string",
      required: true,
      hint: "Queue UUID — list them with Queue List.",
    },
    {
      key: "userId",
      label: "Acting agent id",
      type: "string",
      hint: "Optional agent/admin UUID to record as the one who transferred it.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Dixa answered 204" },
    { key: "conversationId", type: "string", label: "The conversation id" },
  ],

  async execute(input, ctx) {
    const id = conversationId(input.conversationId);
    const userId = input.userId?.trim();
    await new DixaClient(ctx).json(`/conversations/${id}/transfer/queue`, {
      method: "PUT",
      body: { queueId: requireText(input.queueId, "queueId"), ...(userId ? { userId } : {}) },
    });
    return { ok: true, conversationId: id };
  },
};

export default conversationTransferQueue;
