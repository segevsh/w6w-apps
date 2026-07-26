import type { ActionDefinition } from "@w6w/types";
import { type SendCommon, sendCommonBody, TelegramClient, unset } from "../lib/client.ts";
import { caption, chatId, deliveryOptions, messageOutput, parseMode } from "../lib/params.ts";

interface Input extends SendCommon {
  document: string;
  caption?: string;
  parseMode?: string;
  fileName?: string;
}

/**
 * Telegram accepts media three ways: a `file_id` it already stores, a public
 * HTTP(S) URL it fetches itself, or a multipart upload. Only the first two are
 * available here — a multipart upload would mean streaming bytes out of the
 * sandbox, which `ctx.fetch` deliberately does not do.
 */
const action: ActionDefinition<Input> = {
  key: "message-send-document",
  type: "perform",
  resource: "message",
  title: "Send Document",
  description: "Send a document (any file type) to a chat.",
  idempotent: false,
  params: [
    chatId,
    {
      key: "document",
      label: "Document",
      type: "string",
      required: true,
      hint: "HTTP(S) URL, or a `file_id` of a file already on Telegram's servers.",
    },
    caption,
    parseMode,
    {
      key: "fileName",
      label: "File name",
      type: "string",
      hint: "Override the name recipients see.",
    },
    deliveryOptions,
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new TelegramClient(ctx).call("sendDocument", {
      body: {
        ...sendCommonBody(input),
        document: input.document,
        caption: unset(input.caption),
        parse_mode: unset(input.parseMode),
        file_name: unset(input.fileName),
      },
    });
  },
};

export default action;
