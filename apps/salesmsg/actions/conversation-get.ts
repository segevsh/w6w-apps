import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /conversations/{conversation}` (scope `conversations:read`). Includes the contact, owner,
 * number, latest message and `closed_at`.
 */
interface Input {
  conversation: number;
}

const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Get a conversation by ID.",
  params: [
    {
      key: "conversation",
      label: "Conversation ID",
      type: "number",
      required: true,
      hint: "The conversation ID.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "response", type: "object", label: "Conversation" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(`/conversations/${encodePathSegment(input.conversation)}`);
  },
};

export default conversationGet;
