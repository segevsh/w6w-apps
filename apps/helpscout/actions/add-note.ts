import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";
import { threadStatusOptions } from "../lib/params.ts";

interface Input {
  conversationId: number;
  text: string;
  userId?: number;
  status?: string;
}

const addNote: ActionDefinition<Input> = {
  key: "add-note",
  type: "perform",
  resource: "conversation",
  title: "Add Note to Conversation",
  description: "Add an internal note, visible to agents but never sent to the customer.",
  idempotent: false,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "text",
      label: "Note",
      type: "text",
      required: true,
      config: { multiline: true },
    },
    {
      key: "userId",
      label: "Posting as (user ID)",
      type: "number",
      advanced: true,
      hint: "Defaults to the connection's own user.",
    },
    {
      key: "status",
      label: "Set conversation status",
      type: "select",
      advanced: true,
      options: threadStatusOptions,
      hint: "If unset, a note thread reactivates the conversation.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Thread ID" }],

  async execute(input, ctx) {
    const { resourceId } = await new HelpScoutClient(ctx).create(
      `/conversations/${input.conversationId}/notes`,
      { text: input.text, user: input.userId, status: input.status },
    );
    return { id: resourceId };
  },
};

export default addNote;
