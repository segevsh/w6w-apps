import type { ActionDefinition } from "@w6w/types";
import { TelegramClient, unset } from "../lib/client.ts";
import { messageOutput, parseMode } from "../lib/params.ts";

interface Input {
  chatId?: string;
  messageId?: number;
  inlineMessageId?: string;
  text: string;
  parseMode?: string;
  disableWebPagePreview?: boolean;
  replyMarkup?: unknown;
}

/**
 * Telegram addresses an editable message two mutually exclusive ways: by
 * (`chat_id`, `message_id`) for a message the bot sent into a chat, or by
 * `inline_message_id` for one sent via inline mode. Exactly one pair must be
 * supplied, which `required` cannot express — so it is enforced here.
 */
const messageEdit: ActionDefinition<Input> = {
  key: "message-edit",
  type: "perform",
  resource: "message",
  title: "Edit Message Text",
  description: "Replace the text of a message the bot previously sent.",
  // Editing to the same content is a no-op upstream ("message is not modified"),
  // so a retry converges on the same state.
  idempotent: true,
  params: [
    {
      key: "chatId",
      label: "Chat ID",
      type: "string",
      hint: "Required unless you are editing an inline message.",
    },
    {
      key: "messageId",
      label: "Message ID",
      type: "number",
      hint: "Required unless you are editing an inline message.",
    },
    {
      key: "inlineMessageId",
      label: "Inline message ID",
      type: "string",
      hint: "Use instead of Chat ID + Message ID for messages sent through inline mode.",
    },
    { key: "text", label: "Text", type: "text", required: true, config: { multiline: true } },
    parseMode,
    { key: "disableWebPagePreview", label: "Disable link preview", type: "boolean" },
    { key: "replyMarkup", label: "Reply markup", type: "json" },
  ],
  output: messageOutput,

  execute(input, ctx) {
    const byInline = !!input.inlineMessageId;
    if (!byInline && !(input.chatId && input.messageId)) {
      throw new Error(
        "Provide either `inlineMessageId`, or both `chatId` and `messageId`.",
      );
    }
    return new TelegramClient(ctx).call("editMessageText", {
      body: {
        chat_id: byInline ? undefined : input.chatId,
        message_id: byInline ? undefined : input.messageId,
        inline_message_id: input.inlineMessageId,
        text: unset(input.text),
        parse_mode: unset(input.parseMode),
        link_preview_options: input.disableWebPagePreview ? { is_disabled: true } : undefined,
        reply_markup: input.replyMarkup,
      },
    });
  },
};

export default messageEdit;
