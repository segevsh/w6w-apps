import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, PlacidClient, required } from "../lib/client.ts";

interface Input {
  contentBase64: string;
  filename: string;
  title?: string;
  terms_accepted: boolean;
}

/** `POST /fonts` — multipart/form-data: `file`, optional `title`, required truthy `terms_accepted`. ttf, otf, woff, woff2. */
const action: ActionDefinition<Input, unknown> = {
  key: "font-upload",
  type: "perform",
  resource: "font",
  title: "Upload Font",
  description:
    "Upload a custom font (ttf, otf, woff, woff2) given as base64. You must confirm you have the right to use it.",
  idempotent: false,
  params: [
    { key: "contentBase64", label: "Font file (base64)", type: "text", required: true },
    {
      key: "filename",
      label: "Filename",
      type: "string",
      required: true,
      hint: "With extension, e.g. `Brand-Bold.woff2`.",
    },
    { key: "title", label: "Title", type: "string", validation: { maxLength: 200 } },
    {
      key: "terms_accepted",
      label: "I have the right to use this font",
      type: "boolean",
      required: true,
      hint: "Placid requires this to be true on every upload.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Font code (use as fontFamily)" },
    { key: "title", type: "string", label: "Title" },
    { key: "filename", type: "string", label: "Filename" },
    { key: "created_at", type: "string", label: "Uploaded at" },
  ],

  async execute(input, ctx) {
    if (input.terms_accepted !== true) {
      throw new Error("`terms_accepted` must be true: confirm you may use this font");
    }
    const filename = required(input.filename, "filename");
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    if (!["ttf", "otf", "woff", "woff2"].includes(ext)) {
      throw new Error("`filename` must end in .ttf, .otf, .woff or .woff2");
    }
    const bytes = base64ToBytes(required(input.contentBase64, "contentBase64"));
    const fields: Record<string, string> = { terms_accepted: "1" };
    if (input.title) fields.title = input.title;
    return await new PlacidClient(ctx).multipart("/fonts", fields, [{
      field: "file",
      filename,
      contentType: ext === "otf" ? "font/otf" : ext === "ttf" ? "font/ttf" : `font/${ext}`,
      bytes,
    }]);
  },
};

export default action;
