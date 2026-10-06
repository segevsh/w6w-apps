import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/** DELETE /v1/files/{file_id}. */
const deleteFile: ActionDefinition<Input> = {
  key: "delete-file",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete a file from xAI storage (DELETE /v1/files/{file_id}).",
  idempotent: true,
  params: [{ key: "fileId", label: "File ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "File id" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    return new XaiClient(ctx).request(`/v1/files/${encodeURIComponent(input.fileId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteFile;
