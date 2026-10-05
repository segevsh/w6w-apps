import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `PUT /conversations/{conversation}/open` (scope `conversations:write`).
 */
interface Input {
  conversation: number;
}

const conversationOpen: ActionDefinition<Input> = {
  key: "conversation-open",
  type: "perform",
  resource: "conversation",
  title: "Open Conversation",
  description: "Reopen a closed conversation.",
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
  output: [{ key: "response", type: "object", label: "The reopened conversation" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(
      `/conversations/${encodePathSegment(input.conversation)}/open`,
      {
        method: "PUT",
      },
    );
  },
};

export default conversationOpen;
