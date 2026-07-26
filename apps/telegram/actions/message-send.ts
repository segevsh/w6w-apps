import type { ActionDefinition } from "@w6w/types";
import { type SendCommon, sendCommonBody, TelegramClient, unset } from "../lib/client.ts";
import { chatId, deliveryOptions, messageOutput, parseMode } from "../lib/params.ts";

interface Input extends SendCommon {
  text: string;
  parseMode?: string;
  disableWebPagePreview?: boolean;
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a text message to a chat, group, supergroup or channel.",
  // Telegram assigns a fresh message_id per call and has no request-dedupe key,
  // so a retry posts a second message.
  idempotent: false,
  params: [
    chatId,
    { key: "text", label: "Text", type: "text", required: true, config: { multiline: true } },
    parseMode,
    {
      key: "disableWebPagePreview",
      label: "Disable link preview",
      type: "boolean",
      hint: "Suppress the preview card Telegram renders for the first link.",
    },
    deliveryOptions,
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new TelegramClient(ctx).call("sendMessage", {
      body: {
        ...sendCommonBody(input),
        text: unset(input.text),
        parse_mode: unset(input.parseMode),
        link_preview_options: input.disableWebPagePreview ? { is_disabled: true } : undefined,
      },
    });
  },
};

export default messageSend;
