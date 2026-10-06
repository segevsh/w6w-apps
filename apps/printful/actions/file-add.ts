import type { ActionDefinition } from "@w6w/types";
import { compact, PrintfulClient } from "../lib/client.ts";

interface Input {
  url: string;
  type?: string;
  filename?: string;
  visible?: boolean;
}

/** `POST /files` — Add a print file to the file library by public URL. */
const fileAdd: ActionDefinition<Input> = {
  key: "file-add",
  type: "perform",
  resource: "file",
  title: "Add File",
  description:
    "Add a print file to the file library by public URL. An identical URL returns the existing file.",
  idempotent: true,
  params: [
    {
      key: "url",
      label: "File URL",
      type: "string",
      required: true,
      hint: "Publicly reachable URL of the image.",
    },
    {
      key: "type",
      label: "Type",
      type: "string",
      hint: "File type, e.g. `default`, `back`, `label_outside`.",
    },
    {
      key: "filename",
      label: "Filename",
      type: "string",
      hint: "Name to store the file under.",
    },
    {
      key: "visible",
      label: "Visible",
      type: "boolean",
      hint: "Show the file in the library UI.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "File ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Processing status" },
    { key: "url", type: "string", label: "URL" },
    { key: "preview_url", type: "string", label: "Preview URL" },
    { key: "thumbnail_url", type: "string", label: "Thumbnail URL" },
    { key: "width", type: "number", label: "Width" },
    { key: "height", type: "number", label: "Height" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "POST",
      "/files",
      {
        body: compact({
          url: input.url,
          type: input.type,
          filename: input.filename,
          visible: input.visible,
        }),
      },
    );
    return result ?? {};
  },
};

export default fileAdd;
