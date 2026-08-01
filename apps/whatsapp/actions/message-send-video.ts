import type { ActionDefinition } from "@w6w/types";
import { unset, WhatsAppClient } from "../lib/client.ts";
import { caption, messageOutput, to } from "../lib/params.ts";

interface Input {
  to: string;
  link: string;
  caption?: string;
}

/**
 * By link only — see `message-send-image` for why upload/media-id are out of
 * reach from inside the sandbox.
 */
const messageSendVideo: ActionDefinition<Input> = {
  key: "message-send-video",
  type: "perform",
  resource: "message",
  title: "Send Video",
  description: "Send a video by public URL.",
  idempotent: false,
  params: [
    to,
    {
      key: "link",
      label: "Video URL",
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
      type: "video",
      video: { link: input.link, caption: unset(input.caption) },
    });
  },
};

export default messageSendVideo;
