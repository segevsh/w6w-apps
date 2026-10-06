import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, pageSegment, requireString } from "../lib/client.ts";

interface Input {
  type: "image" | "audio" | "video" | "file";
  url: string;
  pageId?: string;
}

/**
 * Save an asset from a public URL for reuse — `POST /{page}/message_attachments` with
 * `message.attachment.payload.is_reusable: true`. The returned `attachment_id` goes into
 * `send-attachment`; it is private to this Page and expires after 90 days.
 *
 * Limits: 25 MB overall, 8 MB for images; a video must be fetchable within 75 seconds and
 * any other type within 10. Uploading raw bytes (multipart `filedata`) is not supported here.
 */
const uploadAttachment: ActionDefinition<Input, { attachment_id: string }> = {
  key: "upload-attachment",
  type: "perform",
  resource: "attachment",
  title: "Upload Attachment",
  description: "Save an image, audio, video or file from a URL and get a reusable attachment ID.",
  idempotent: false,
  params: [
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
    { key: "url", label: "Asset URL", type: "string", required: true },
    { key: "pageId", label: "Page ID", type: "string", hint: "Defaults to `me`." },
  ],
  output: [{ key: "attachment_id", type: "string", label: "Attachment ID" }],

  execute(input, ctx) {
    return new MessengerClient(ctx).request<{ attachment_id: string }>(
      `/${pageSegment(input.pageId)}/message_attachments`,
      {
        method: "POST",
        body: {
          message: {
            attachment: {
              type: input.type,
              payload: { url: requireString("url", input.url), is_reusable: true },
            },
          },
        },
      },
    );
  },
};

export default uploadAttachment;
