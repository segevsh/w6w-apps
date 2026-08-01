import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

interface Output {
  success: boolean;
  fileId: string;
}

/**
 * Delete a file (moves it to the trash). Box answers with `204 No Content`,
 * so this reports a small success object rather than an empty body.
 *
 * https://developer.box.com/reference/delete-files-id/
 */
const deleteFile: ActionDefinition<Input, Output> = {
  key: "delete-file",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete a file by ID.",
  idempotent: true,
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "fileId", type: "string", label: "File ID" },
  ],

  async execute(input, ctx) {
    const client = new BoxClient(ctx);
    await client.request(`/files/${input.fileId}`, { method: "DELETE" });
    return { success: true, fileId: input.fileId };
  },
};

export default deleteFile;
