import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/search/conversation`
 *
 * Search a conversation; returns matching message ids (latest 10,000 at most).
 */
interface Input {
  conversationId: number;
  query: string;
  fromUserId?: number;
  beforeTs?: number;
  afterTs?: number;
}

const searchConversation: ActionDefinition<Input> = {
  key: "search-conversation",
  type: "search",
  resource: "search",
  title: "Search Within Conversation",
  description: "Search a conversation; returns matching message ids (latest 10,000 at most).",
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "fromUserId",
      label: "From user ID",
      type: "number",
      hint: "Only objects created by this user.",
    },
    { key: "beforeTs", label: "Before (Unix time)", type: "number" },
    { key: "afterTs", label: "After (Unix time)", type: "number" },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/search/conversation",
      params: {
        "conversation_id": input.conversationId,
        "query": input.query,
        "from_user_id": input.fromUserId,
        "before_ts": input.beforeTs,
        "after_ts": input.afterTs,
      },
    });
  },
};

export default searchConversation;
