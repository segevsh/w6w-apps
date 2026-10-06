import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";

interface Input {
  fileId: number;
}

/** `GET /files/{fileId}` — Get a file from the library, including its processing status. */
const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Get a file from the library, including its processing status.",
  params: [
    {
      key: "fileId",
      label: "File ID",
      type: "number",
      required: true,
      hint: "File id from Add File.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "File ID" },
    { key: "status", type: "string", label: "Processing status" },
    { key: "url", type: "string", label: "URL" },
    { key: "filename", type: "string", label: "Filename" },
    { key: "mime_type", type: "string", label: "MIME type" },
    { key: "width", type: "number", label: "Width" },
    { key: "height", type: "number", label: "Height" },
    { key: "dpi", type: "number", label: "DPI" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/files/${seg(input.fileId)}`,
    );
    return result ?? {};
  },
};

export default fileGet;
