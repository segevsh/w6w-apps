import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, PlacidClient, required } from "../lib/client.ts";

interface Input {
  contentBase64: string;
  filename: string;
  contentType: string;
  fileKey?: string;
}

/** `POST /media` — multipart/form-data, field name is free-form (up to 5 files per call; this action sends one). */
const action: ActionDefinition<Input, unknown> = {
  key: "media-upload",
  type: "perform",
  resource: "media",
  title: "Upload Media",
  description:
    "Temporarily upload one file (as base64) to Placid storage and get back a Placid URL to use in a picture layer.",
  idempotent: false,
  params: [
    { key: "contentBase64", label: "File (base64)", type: "text", required: true },
    { key: "filename", label: "Filename", type: "string", required: true },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      required: true,
      placeholder: "image/png",
    },
    {
      key: "fileKey",
      label: "Field name",
      type: "string",
      default: "file",
      advanced: true,
      hint: "The key the returned URL is reported under.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "Placid URL of the uploaded file" },
    { key: "media", type: "array", label: "Uploaded files (file_key, file_id)" },
  ],

  async execute(input, ctx) {
    const fileKey = String(input.fileKey ?? "").trim() || "file";
    const res = await new PlacidClient(ctx).multipart<
      { media?: Array<{ file_key: string; file_id: string }> }
    >("/media", {}, [{
      field: fileKey,
      filename: required(input.filename, "filename"),
      contentType: required(input.contentType, "contentType"),
      bytes: base64ToBytes(required(input.contentBase64, "contentBase64")),
    }]);
    const media = res.media ?? [];
    return { url: media[0]?.file_id ?? null, media };
  },
};

export default action;
