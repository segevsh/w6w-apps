import type { ActionDefinition } from "@w6w/types";
import { conversationId, DixaClient } from "../lib/client.ts";
import { conversationIdParam, requireText } from "../lib/params.ts";

interface Input {
  conversationId: number | string;
  agentId: string;
  force?: boolean;
}

const conversationAssign: ActionDefinition<Input> = {
  key: "conversation-assign",
  type: "perform",
  resource: "conversation",
  title: "Assign Conversation",
  description:
    "Assign (claim) a conversation to an agent. Without force, Dixa refuses to take it from an agent who already holds it.",
  idempotent: true,
  params: [
    conversationIdParam,
    { key: "agentId", label: "Agent id", type: "string", required: true, hint: "Agent UUID." },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      hint: "Reassign even if another agent currently holds the conversation.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Dixa answered 204" },
    { key: "conversationId", type: "string", label: "The conversation id" },
  ],

  async execute(input, ctx) {
    const id = conversationId(input.conversationId);
    const body: Record<string, unknown> = { agentId: requireText(input.agentId, "agentId") };
    if (typeof input.force === "boolean") body.force = input.force;
    await new DixaClient(ctx).json(`/conversations/${id}/claim`, { method: "PUT", body });
    return { ok: true, conversationId: id };
  },
};

export default conversationAssign;
