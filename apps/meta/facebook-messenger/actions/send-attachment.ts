import type { ActionDefinition } from "@w6w/types";
import { MessengerClient } from "../lib/client.ts";
import {
  recipientParam,
  type SendInput,
  sendMessage,
  sendOptionParams,
  sendOutput,
  type SendResponse,
} from "../lib/send.ts";

interface Input extends SendInput {
  type: "image" | "audio" | "video" | "file";
  url?: string;
  attachmentId?: string;
  isReusable?: boolean;
}

/**
 * Send an image, audio, video or file — `POST /{page}/messages` with `message.attachment`.
 * The asset is named either by a public `url` or by an `attachmentId` saved earlier
 * with `upload-attachment`.
 */
const sendAttachment: ActionDefinition<Input, SendResponse> = {
  key: "send-attachment",
  type: "perform",
  resource: "message",
  title: "Send Attachment",
  description: "Send an image, audio, video or file, from a URL or a previously saved attachment.",
  idempotent: false,
  params: [
    recipientParam,
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "image",
      options: [
        { value: "image", label: "Image" },
        { value: "audio", label: "Audio" },
        { value: "video", label: "Video" },
        { value: "file", label: "File" },
      ],
    },
    {
      key: "url",
      label: "Asset URL",
      type: "string",
      hint: "Public URL. Max 8 MB for images, 25 MB for other types.",
    },
    {
      key: "attachmentId",
      label: "Saved attachment ID",
      type: "string",
      hint: "From `upload-attachment`. Used instead of the URL. IDs expire after 90 days.",
    },
    {
      key: "isReusable",
      label: "Save for reuse",
      type: "boolean",
      default: false,
      hint:
        "Only with a URL: also save the asset and return its attachment_id. Leave off to upload and send in one step.",
    },
    ...sendOptionParams,
  ],
  output: [
    ...sendOutput,
    { key: "attachment_id", type: "string", label: "Attachment ID (when saved for reuse)" },
  ],

  execute(input, ctx) {
    if (!input.url && !input.attachmentId) throw new Error("url or attachmentId is required");
    if (input.url && input.attachmentId) {
      throw new Error("provide either url or attachmentId, not both");
    }
    const payload: Record<string, unknown> = input.attachmentId
      ? { attachment_id: input.attachmentId }
      : { url: input.url, ...(input.isReusable ? { is_reusable: true } : {}) };
    return sendMessage(new MessengerClient(ctx), input, {
      attachment: { type: input.type, payload },
    });
  },
};

export default sendAttachment;
