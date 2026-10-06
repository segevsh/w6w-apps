import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/** GET /v1/files/{file_id} — metadata only; 404 if deleted or expired. */
const getFile: ActionDefinition<Input> = {
  key: "get-file",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Get a file's metadata (GET /v1/files/{file_id}).",
  params: [{ key: "fileId", label: "File ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "File id" },
    { key: "filename", type: "string", label: "Filename" },
    { key: "bytes", type: "number", label: "Size in bytes" },
  ],

  execute(input, ctx) {
    return new XaiClient(ctx).request(`/v1/files/${encodeURIComponent(input.fileId)}`);
  },
};

export default getFile;
