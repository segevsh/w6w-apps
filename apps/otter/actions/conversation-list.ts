import type { ActionDefinition } from "@w6w/types";
import { OtterClient, type OtterConversation, type OtterMeta } from "../lib/client.ts";

interface Input {
  includeShared?: boolean;
  channelId?: string;
  limit?: number;
  cursor?: string;
}

interface Output {
  meta: OtterMeta;
  data: OtterConversation[];
}

const conversationList: ActionDefinition<Input, Output> = {
  key: "conversation-list",
  type: "search",
  resource: "conversation",
  title: "List Conversations",
  description:
    "List conversations for the authenticated user, most recent first. Cursor-paginated.",
  params: [
    {
      key: "includeShared",
      label: "Include shared conversations",
      type: "boolean",
      hint: "Default: false. Automatically treated as true when Channel ID is set.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "Filter conversations by channel. Overrides Include shared conversations.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "Items per page. Minimum 1, maximum 100.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      advanced: true,
      hint: "The previous response's meta.next_cursor. Keep paging until meta.has_more is false.",
    },
  ],
  output: [
    { key: "meta.has_more", type: "boolean", label: "Has more" },
    { key: "meta.next_cursor", type: "string", label: "Next cursor" },
    { key: "data", type: "array", label: "Conversations" },
  ],

  execute(input, ctx) {
    return new OtterClient(ctx).get<Output>("/conversations", {
      include_shared: input.includeShared,
      channel_id: input.channelId,
      limit: input.limit,
      cursor: input.cursor,
    });
  },
};

export default conversationList;
