import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";
import { conversationOutput } from "../lib/params.ts";

interface Input {
  conversationId: number;
  embedThreads?: boolean;
}

const getConversation: ActionDefinition<Input> = {
  key: "get-conversation",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Fetch a single conversation by ID.",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "embedThreads",
      label: "Include threads",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Beacon chat threads come back truncated here — use List Threads for the full text.",
    },
  ],
  output: conversationOutput,

  execute(input, ctx) {
    return new HelpScoutClient(ctx).request(`/conversations/${input.conversationId}`, {
      query: { embed: input.embedThreads ? "threads" : undefined },
    });
  },
};

export default getConversation;
