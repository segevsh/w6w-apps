import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `PUT /conversations/{conversation}/close` (scope `conversations:write`). Closes it for every
 * participant of the team and sets `closed_at`; it stays visible under Closed.
 */
interface Input {
  conversation: number;
}

const conversationClose: ActionDefinition<Input> = {
  key: "conversation-close",
  type: "perform",
  resource: "conversation",
  title: "Close Conversation",
  description: "Close a conversation.",
  idempotent: true,
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
  output: [{ key: "response", type: "object", label: "The closed conversation" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(
      `/conversations/${encodePathSegment(input.conversation)}/close`,
      {
        method: "PUT",
      },
    );
  },
};

export default conversationClose;
