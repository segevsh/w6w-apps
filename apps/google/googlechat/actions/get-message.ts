import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, messageName } from "../lib/client.ts";

interface Input {
  space: string;
  message: string;
  markupSyntax?: "MARKUP_SYNTAX_CHAT" | "MARKUP_SYNTAX_MARKDOWN";
}

/**
 * `spaces.messages.get` — GET /v1/{name=spaces/*&#47;messages/*}
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/get
 *
 * A message id may be either the system-assigned one (which contains a dot, e.g.
 * `BBBBBBBBBBB.BBBBBBBBBBB`) or a `client-` custom id set at creation time.
 * Both are single path segments, so both go through the same normaliser.
 */
const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch a single message by id.",
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
      key: "message",
      label: "Message",
      type: "string",
      required: true,
      hint:
        "The message id, a `client-` custom id, or the full resource name `spaces/{space}/messages/{message}` — a full name here overrides Space.",
      placeholder: "BBBBBBBBBBB.BBBBBBBBBBB",
    },
    {
      key: "markupSyntax",
      label: "Formatted text syntax",
      type: "select",
      options: [
        { value: "MARKUP_SYNTAX_CHAT", label: "Chat markup" },
        { value: "MARKUP_SYNTAX_MARKDOWN", label: "Markdown" },
      ],
      hint: "Controls the syntax of the returned `formattedText` field.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "text", type: "string", label: "Text" },
    { key: "formattedText", type: "string", label: "Formatted text" },
    { key: "sender", type: "object", label: "Sender" },
    { key: "createTime", type: "string", label: "Created at" },
    { key: "thread", type: "object", label: "Thread" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    return await client.request(`/${messageName(input.space, input.message)}`, {
      query: { markupSyntax: input.markupSyntax },
    });
  },
};

export default getMessage;
