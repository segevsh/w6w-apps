import type { ActionDefinition } from "@w6w/types";
import { type SendCommon, sendCommonBody, TelegramClient } from "../lib/client.ts";
import { chatId, deliveryOptions, messageOutput } from "../lib/params.ts";

interface Input extends SendCommon {
  sticker: string;
  emoji?: string;
}

const messageSendSticker: ActionDefinition<Input> = {
  key: "message-send-sticker",
  type: "perform",
  resource: "message",
  title: "Send Sticker",
  description: "Send a static .WEBP, animated .TGS or video .WEBM sticker.",
  idempotent: false,
  params: [
    chatId,
    {
      key: "sticker",
      label: "Sticker",
      type: "string",
      required: true,
      hint: "A `file_id` of a sticker Telegram already stores, or an HTTP(S) URL to a .WEBP file.",
    },
    {
      key: "emoji",
      label: "Emoji",
      type: "string",
      hint: "The emoji this sticker corresponds to. Only applies to newly uploaded stickers.",
    },
    deliveryOptions,
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new TelegramClient(ctx).call("sendSticker", {
      body: { ...sendCommonBody(input), sticker: input.sticker, emoji: input.emoji },
    });
  },
};

export default messageSendSticker;
