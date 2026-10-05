import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, SalesmsgClient } from "../lib/client.ts";

/**
 * `POST /conversations/{conversation}/reassign` (scope `conversations:write`). `user_id` is a
 * **query parameter**; the document says a blank value unassigns.
 */
interface Input {
  conversation: number;
  user_id?: number;
}

const conversationAssign: ActionDefinition<Input> = {
  key: "conversation-assign",
  type: "perform",
  resource: "conversation",
  title: "Assign Conversation",
  description: "Assign a conversation to a user, or leave the user blank to unassign it.",
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
    {
      key: "user_id",
      label: "User ID",
      type: "number",
      hint: "A member ID from List Members. Blank sets the conversation to Unassigned.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "response", type: "object", label: "The conversation" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json(
      `/conversations/${encodePathSegment(input.conversation)}/reassign`,
      {
        method: "POST",
        query: {
          user_id: input.user_id,
        },
      },
    );
  },
};

export default conversationAssign;
