import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, RocketChatClient } from "../lib/client.ts";

interface Input {
  room: string;
  text?: string;
  threadMessageId?: string;
  alias?: string;
  avatar?: string;
  emoji?: string;
  parseUrls?: boolean;
  attachments?: unknown;
  customFields?: unknown;
}

// `POST /api/v1/chat.postMessage`. The spec documents two body variants: `roomId` and `channel`.
// Only the `roomId` variant lists `tmid` (thread replies), so this always sends `roomId` — which
// accepts a room id, `#channel` or `@username` per its description.
const postMessage: ActionDefinition<Input> = {
  key: "post-message",
  type: "perform",
  resource: "message",
  title: "Post Message",
  description:
    "Post a message to a channel, private group or user. Supports attachments and thread replies. " +
    "`alias` and `avatar` need the `message-impersonate` permission (the bot role by default).",
  idempotent: false,
  params: [
    {
      key: "room",
      label: "Room",
      type: "string",
      required: true,
      placeholder: "#general",
      hint: "A room ID, `#channel-name`, or `@username` for a direct message.",
    },
    { key: "text", label: "Text", type: "text", hint: "Optional when attachments are given." },
    {
      key: "threadMessageId",
      label: "Reply to message ID",
      type: "string",
      hint: "The `_id` of the message to reply to; starts or continues a thread (`tmid`).",
    },
    {
      key: "alias",
      label: "Alias",
      type: "string",
      hint: "Display name shown instead of the user's.",
    },
    { key: "avatar", label: "Avatar URL", type: "string" },
    { key: "emoji", label: "Avatar emoji", type: "string", placeholder: ":smile:" },
    {
      key: "parseUrls",
      label: "Parse URLs",
      type: "boolean",
      hint: "Set false to suppress link previews.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: "Array of attachment objects (`title`, `text`, `color`, `image_url`, `fields`, ...).",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: "Needs custom message fields enabled and validated in the workspace settings.",
    },
  ],
  output: [
    { key: "message", type: "object", label: "The posted message" },
    { key: "message._id", type: "string", label: "Message ID" },
    { key: "channel", type: "string", label: "Channel the message went to" },
    { key: "ts", type: "number", label: "Timestamp (ms)" },
  ],

  execute(input, ctx) {
    if (!input.text && !input.attachments) throw new Error("Provide text or attachments");
    return new RocketChatClient(ctx).request("/chat.postMessage", {
      method: "POST",
      body: compact({
        roomId: input.room,
        text: input.text,
        tmid: input.threadMessageId,
        alias: input.alias,
        avatar: input.avatar,
        emoji: input.emoji,
        parseUrls: input.parseUrls,
        attachments: jsonValue(input.attachments, "attachments"),
        customFields: jsonValue(input.customFields, "customFields"),
      }),
    });
  },
};

export default postMessage;
