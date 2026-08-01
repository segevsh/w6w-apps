import type { ActionDefinition } from "@w6w/types";
import { unset, WhatsAppClient } from "../lib/client.ts";
import { caption, messageOutput, to } from "../lib/params.ts";

interface Input {
  to: string;
  link: string;
  caption?: string;
}

/**
 * By link only. The Cloud API also accepts a previously-uploaded media `id`
 * or a raw multipart upload, but both require moving bytes through this app
 * — a multipart body for the former, and a POST to `/{phone-number-id}/media`
 * for the latter — which `ctx.fetch` deliberately does not do from inside the
 * sandbox (same limitation Telegram's media actions document).
 */
const messageSendImage: ActionDefinition<Input> = {
  key: "message-send-image",
  type: "perform",
  resource: "message",
  title: "Send Image",
  description: "Send an image by public URL.",
  idempotent: false,
  params: [
    to,
    {
      key: "link",
      label: "Image URL",
      type: "string",
      required: true,
      hint: "Public HTTP(S) URL. Meta fetches it — the number sending must be able to reach it.",
    },
    caption,
  ],
  output: messageOutput,

  execute(input, ctx) {
    return new WhatsAppClient(ctx).sendMessage({
      to: input.to,
      type: "image",
      image: { link: input.link, caption: unset(input.caption) },
    });
  },
};

export default messageSendImage;
