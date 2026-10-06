import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoCliqClient } from "../lib/client.ts";
import { limitParam } from "../lib/params.ts";

interface Input {
  limit?: number;
  modifiedBefore?: number;
  modifiedAfter?: number;
  drafts?: boolean;
}

interface Output {
  chats: Array<Record<string, unknown>>;
}

/**
 * `GET /api/v2/chats` — "Retrieve all direct chats" (direct messages, group
 * chats, bot chats — not channels), scope `ZohoCliq.Chats.READ`. The response
 * is `{ chats: [...] }` with no cursor; page by `modifiedBefore` instead.
 */
const chatList: ActionDefinition<Input, Output> = {
  key: "chat-list",
  type: "read",
  resource: "chat",
  title: "List Chats",
  description:
    "List direct, group and bot chats (not channels — use List Channels). Page backwards with " +
    "'Modified before'.",
  params: [
    limitParam(100),
    {
      key: "modifiedBefore",
      label: "Modified before",
      type: "number",
      hint: "Epoch milliseconds: chats whose last message is older than this.",
    },
    {
      key: "modifiedAfter",
      label: "Modified after",
      type: "number",
      hint: "Epoch milliseconds: chats whose last message is newer than this.",
    },
    { key: "drafts", label: "Only chats with a draft", type: "boolean" },
  ],
  output: [{ key: "chats", type: "array", label: "Chats" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { chats?: Array<Record<string, unknown>> }
    >("/chats", {
      query: compact({
        limit: input.limit,
        modified_before: input.modifiedBefore,
        modified_after: input.modifiedAfter,
        drafts: input.drafts,
      }),
    });
    return { chats: body?.chats ?? [] };
  },
};

export default chatList;
