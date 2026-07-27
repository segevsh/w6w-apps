import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  displayAs?: string;
}

/**
 * GET /conversations/{id} — fetch a single conversation, including its message
 * parts. `display_as=plaintext` strips HTML from message bodies.
 */
const conversationGet: ActionDefinition<Input> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Retrieve a single conversation by its ID, including its parts.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string", required: true },
    {
      key: "displayAs",
      label: "Display as",
      type: "select",
      advanced: true,
      options: [
        { value: "plaintext", label: "Plaintext" },
      ],
      hint: "Set to `plaintext` to strip HTML from message bodies.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "source", type: "object", label: "Source message" },
  ],

  execute(input, ctx) {
    return new IntercomClient(ctx).request(
      `/conversations/${encodeURIComponent(input.conversationId)}`,
      { query: { display_as: input.displayAs } },
    );
  },
};

export default conversationGet;
