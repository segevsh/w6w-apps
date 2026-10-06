import type { ActionDefinition } from "@w6w/types";
import { compact, seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  number: string;
  type: string;
  text?: string;
  backgroundColor?: string;
  font?: number;
  mediaUrl?: string;
}

const statusPost: ActionDefinition<Input> = {
  key: "status-post",
  type: "perform",
  idempotent: false,
  resource: "status",
  title: "Post WhatsApp Status",
  description:
    "Post an ephemeral WhatsApp status (a story) from a connected number: text with optional colour " +
    "and font, an image, or a video by public URL (POST " +
    "/whatsapp/set-{text|image|video}-status/{number}). Queued, not published, when it returns.",
  params: [
    {
      key: "number",
      label: "Connected number",
      type: "string",
      required: true,
    },
    {
      key: "type",
      label: "Status type",
      type: "select",
      required: true,
      options: [{ "value": "text", "label": "Text" }, { "value": "image", "label": "Image" }, {
        "value": "video",
        "label": "Video",
      }],
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      hint: "Text statuses only.",
    },
    {
      key: "backgroundColor",
      label: "Background colour",
      type: "string",
      hint: "Hex, e.g. #0275d8. Text statuses only.",
    },
    {
      key: "font",
      label: "Font",
      type: "number",
      hint: "Font style id, e.g. 10. Text statuses only.",
    },
    {
      key: "mediaUrl",
      label: "Media URL",
      type: "string",
      hint: "Public URL of the image or video. Image and video statuses only.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    if (input.type === "text") {
      if (!input.text) throw new Error("a text status needs `text`");
      const params = compact({ backgroundColor: input.backgroundColor, font: input.font });
      return client.post(
        `/whatsapp/set-text-status/${seg(input.number)}`,
        compact({ text: input.text, params: Object.keys(params).length ? params : undefined }),
      );
    }
    if (input.type === "image" || input.type === "video") {
      if (!input.mediaUrl) throw new Error(`an ${input.type} status needs \`mediaUrl\``);
      return client.post(
        `/whatsapp/set-${input.type}-status/${seg(input.number)}`,
        { [`${input.type}_url`]: input.mediaUrl },
      );
    }
    throw new Error("type must be text, image or video");
  },
};

export default statusPost;
