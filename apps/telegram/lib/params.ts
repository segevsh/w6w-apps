import type { Param } from "@w6w/types";

/**
 * Param fragments reused across the send-* actions. Telegram gives every
 * `send*` method the same delivery options, so they are declared once here —
 * an action spreads the pieces it supports rather than restating them.
 */

export const chatId: Param = {
  key: "chatId",
  label: "Chat ID",
  type: "string",
  required: true,
  hint: "Numeric chat id, or `@channelusername` for a public channel.",
};

export const parseMode: Param = {
  key: "parseMode",
  label: "Parse mode",
  type: "select",
  default: "",
  options: [
    { value: "", label: "Plain text" },
    { value: "MarkdownV2", label: "MarkdownV2" },
    { value: "HTML", label: "HTML" },
    { value: "Markdown", label: "Markdown (legacy)" },
  ],
  hint: "How Telegram should interpret entities in the text/caption.",
};

export const caption: Param = {
  key: "caption",
  label: "Caption",
  type: "text",
  config: { multiline: true },
  hint: "Media caption, 0-1024 characters.",
};

/**
 * The delivery options every `send*` method accepts. Collapsed into a
 * collapsible section so the action's form leads with what is actually being
 * sent; `section` children keep their own top-level keys.
 */
export const deliveryOptions: Param = {
  key: "delivery",
  label: "Delivery options",
  type: "section",
  section: "collapsible",
  title: "Delivery options",
  subtitle: "Threading, notifications and reply markup",
  collapsed: true,
  children: [
    {
      key: "replyToMessageId",
      label: "Reply to message ID",
      type: "number",
      hint: "Send as a reply to this message.",
    },
    {
      key: "messageThreadId",
      label: "Message thread ID",
      type: "number",
      hint: "Target thread of a forum supergroup.",
    },
    {
      key: "disableNotification",
      label: "Silent",
      type: "boolean",
      hint: "Deliver without a notification sound.",
    },
    {
      key: "protectContent",
      label: "Protect content",
      type: "boolean",
      hint: "Block forwarding and saving of the sent message.",
    },
    {
      key: "replyMarkup",
      label: "Reply markup",
      type: "json",
      hint:
        'Inline keyboard / reply keyboard object, e.g. { "inline_keyboard": [[{ "text": "Open", "url": "https://…" }]] }.',
    },
  ],
};

/** The `Message` object every send-* method returns. */
export const messageOutput = [
  { key: "message_id", type: "number" as const, label: "Message ID" },
  { key: "date", type: "number" as const, label: "Sent at (unix seconds)" },
  { key: "chat", type: "object" as const, label: "Chat" },
  { key: "from", type: "object" as const, label: "Sender" },
];
