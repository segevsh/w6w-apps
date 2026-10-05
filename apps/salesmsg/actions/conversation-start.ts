import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `POST /conversations` (scope `conversations:write`). Fields are **query parameters**. The
 * document notes a conversation is also created automatically on the first message, so this is
 * only needed to address one before anything has been sent.
 */
interface Input {
  contact_id: number;
  team_id?: number;
  number_id?: number;
}

const conversationStart: ActionDefinition<Input> = {
  key: "conversation-start",
  type: "perform",
  resource: "conversation",
  title: "Start Conversation",
  description: "Start a conversation with a contact.",
  idempotent: false,
  params: [
    {
      key: "contact_id",
      label: "Contact ID",
      type: "number",
      required: true,
      hint: "The contact to start the conversation with.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "team_id",
      label: "Team ID",
      type: "number",
      hint: "Start it in this shared inbox.",
    },
    {
      key: "number_id",
      label: "Number ID",
      type: "number",
      hint: "Send from this number.",
    },
  ],
  output: [{ key: "response", type: "object", label: "The conversation" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json("/conversations", {
      method: "POST",
      query: {
        contact_id: input.contact_id,
        team_id: input.team_id,
        number_id: input.number_id,
      },
    });
  },
};

export default conversationStart;
