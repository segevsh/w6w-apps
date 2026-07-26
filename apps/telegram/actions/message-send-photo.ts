import type { ActionDefinition } from "@w6w/types";
import { type SendCommon, sendCommonBody, TelegramClient, unset } from "../lib/client.ts";
import { caption, chatId, deliveryOptions, messageOutput, parseMode } from "../lib/params.ts";

interface Input extends SendCommon {
  photo: string;
  caption?: string;
  parseMode?: string;
}

/**
 * Telegram accepts media three ways: a `file_id` it already stores, a public
 * HTTP(S) URL it fetches itself, or a multipart upload. Only the first two are
 * available here — a multipart upload would mean streaming bytes out of the
 * sandbox, which `ctx.fetch` deliberately does not do.
 */
const action: ActionDefinition<Input> = {
  key: "message-send-photo",
  type: "perform",
  resource: "message",
  title: "Send Photo",
  description: "Send a photo to a chat.",
  idempotent: false,
  params: [
    chatId,
    {
      key: "photo",
      label: "Photo",
      type: "string",
      required: true,
      hint: "HTTP(S) URL, or a `file_id` of a photo already on Telegram's servers.",
    },
    caption,
    parseMode,
    deliveryOptions,
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new TelegramClient(ctx).call("sendPhoto", {
      body: {
        ...sendCommonBody(input),
        photo: input.photo,
        caption: unset(input.caption),
        parse_mode: unset(input.parseMode),
      },
    });
  },
};

export default action;
