import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversations/mute`
 *
 * Mute a conversation for a number of minutes.
 */
interface Input {
  conversationId: number;
  minutes: number;
}

const conversationMute: ActionDefinition<Input> = {
  key: "conversation-mute",
  type: "perform",
  resource: "conversation",
  title: "Mute Conversation",
  description: "Mute a conversation for a number of minutes.",
  idempotent: true,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    { key: "minutes", label: "Minutes", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Conversation ID" },
    { key: "workspace_id", type: "number", label: "Workspace ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/conversations/mute",
      params: { "id": input.conversationId, "minutes": input.minutes },
    });
  },
};

export default conversationMute;
