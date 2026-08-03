import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, spaceName } from "../lib/client.ts";

interface Input {
  space: string;
  filter?: string;
  orderBy?: string;
  showDeleted?: boolean;
  markupSyntax?: "MARKUP_SYNTAX_CHAT" | "MARKUP_SYNTAX_MARKDOWN";
  pageSize?: number;
  pageToken?: string;
}

/**
 * `spaces.messages.list` — GET /v1/{parent=spaces/*}/messages
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list
 *
 * User authentication only in practice: listing a space's history requires the
 * caller to be a member of it.
 */
const listMessages: ActionDefinition<Input> = {
  key: "list-messages",
  type: "read",
  resource: "message",
  title: "List Messages",
  description:
    "List messages in a space, oldest first by default. Returns one page; pass `pageToken` for the next.",
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint: "The space id, or the full resource name `spaces/{space}`.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        'Filters on `create_time` and `thread.name` only. Timestamps are RFC 3339 in double quotes, e.g. `create_time > "2026-01-01T00:00:00+00:00"`.',
      placeholder: 'create_time > "2026-01-01T00:00:00+00:00"',
    },
    {
      key: "orderBy",
      label: "Order",
      type: "select",
      options: [
        { value: "ASC", label: "Oldest first" },
        { value: "DESC", label: "Newest first" },
      ],
      hint: "Orders by `create_time`. Google's default is ascending.",
    },
    {
      key: "showDeleted",
      label: "Show deleted",
      type: "boolean",
      hint: "Deleted messages come back as metadata only — their content is gone.",
    },
    {
      key: "markupSyntax",
      label: "Formatted text syntax",
      type: "select",
      options: [
        { value: "MARKUP_SYNTAX_CHAT", label: "Chat markup" },
        { value: "MARKUP_SYNTAX_MARKDOWN", label: "Markdown" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Google's default is 25; the maximum is 1000.",
      validation: { integer: true, min: 1, max: 1000 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/${spaceName(input.space)}/messages`, {
      query: {
        filter: input.filter,
        orderBy: input.orderBy,
        showDeleted: input.showDeleted,
        markupSyntax: input.markupSyntax,
        pageSize: input.pageSize,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listMessages;
