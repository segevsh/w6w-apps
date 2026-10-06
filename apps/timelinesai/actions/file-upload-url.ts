import type { ActionDefinition } from "@w6w/types";
import { compact, TimelinesClient } from "../lib/client.ts";

interface Input {
  downloadUrl: string;
  filename?: string;
  contentType?: string;
}

const fileUploadUrl: ActionDefinition<Input> = {
  key: "file-upload-url",
  type: "perform",
  idempotent: false,
  resource: "file",
  title: "Upload File from URL",
  description:
    "Upload a file from a publicly reachable URL so it can be attached to a message (POST /files). Filename and mime type are auto-detected.",
  params: [
    {
      "key": "downloadUrl",
      "label": "Download URL",
      "type": "string",
      "required": true,
      "hint": "A publicly accessible URL TimelinesAI can fetch.",
    },
    {
      "key": "filename",
      "label": "Filename",
      "type": "string",
      "hint": "Override the detected filename.",
    },
    {
      "key": "contentType",
      "label": "Content type",
      "type": "string",
      "hint": "Override the detected mime type.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The file: uid, filename, size, mimetype, temporary_download_url",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).post(
      "/files",
      compact({
        download_url: input.downloadUrl,
        filename: input.filename,
        content_type: input.contentType,
      }),
    );
  },
};

export default fileUploadUrl;
