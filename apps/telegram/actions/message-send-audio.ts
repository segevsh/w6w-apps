import type { ActionDefinition } from "@w6w/types";
import { type SendCommon, sendCommonBody, TelegramClient, unset } from "../lib/client.ts";
import { caption, chatId, deliveryOptions, messageOutput, parseMode } from "../lib/params.ts";

interface Input extends SendCommon {
  audio: string;
  caption?: string;
  parseMode?: string;
  duration?: number;
  performer?: string;
  title?: string;
}

/**
 * Telegram accepts media three ways: a `file_id` it already stores, a public
 * HTTP(S) URL it fetches itself, or a multipart upload. Only the first two are
 * available here — a multipart upload would mean streaming bytes out of the
 * sandbox, which `ctx.fetch` deliberately does not do.
 */
const action: ActionDefinition<Input> = {
  key: "message-send-audio",
  type: "perform",
  resource: "message",
  title: "Send Audio",
  description: "Send a audio file, shown in Telegram's music player to a chat.",
  idempotent: false,
  params: [
    chatId,
    {
      key: "audio",
      label: "Audio",
      type: "string",
      required: true,
      hint: "HTTP(S) URL, or a `file_id` of an audio file already on Telegram's servers.",
    },
    caption,
    parseMode,
    { key: "duration", label: "Duration (seconds)", type: "number" },
    { key: "performer", label: "Performer", type: "string" },
    { key: "title", label: "Track title", type: "string" },
    deliveryOptions,
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new TelegramClient(ctx).call("sendAudio", {
      body: {
        ...sendCommonBody(input),
        audio: input.audio,
        caption: unset(input.caption),
        parse_mode: unset(input.parseMode),
        duration: input.duration,
        performer: unset(input.performer),
        title: unset(input.title),
      },
    });
  },
};

export default action;
