import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Retrieves file information (files.info).",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],

  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "title", type: "string", label: "Title" },
    { key: "mimetype", type: "string", label: "MIME type" },
    { key: "filetype", type: "string", label: "File type" },
    { key: "size", type: "number", label: "Size in bytes" },
    { key: "created", type: "number", label: "Created (unix seconds)" },
    { key: "user", type: "string", label: "Uploader user ID" },
    { key: "url_private", type: "string", label: "Private URL" },
    { key: "url_private_download", type: "string", label: "Private download URL" },
    { key: "permalink", type: "string", label: "Permalink" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ file?: unknown }>("/files.info", {
      query: { file: input.fileId },
    });
    return res.file ?? res;
  },
};

export default fileGet;
