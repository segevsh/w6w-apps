import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  recursive?: boolean;
}

interface Output {
  success: boolean;
  folderId: string;
}

/**
 * Delete a folder (moves it to the trash). By default Box refuses to delete
 * a non-empty folder; set `recursive` to delete it and everything inside.
 * Box answers with `204 No Content`, so this reports a small success object
 * rather than an empty body.
 *
 * https://developer.box.com/reference/delete-folders-id/
 */
const deleteFolder: ActionDefinition<Input, Output> = {
  key: "delete-folder",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Delete a folder by ID.",
  idempotent: true,
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
    {
      key: "recursive",
      label: "Recursive",
      type: "boolean",
      default: false,
      hint: "Delete a non-empty folder by recursively deleting the folder and all of its content.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "folderId", type: "string", label: "Folder ID" },
  ],

  async execute(input, ctx) {
    const client = new BoxClient(ctx);
    await client.request(`/folders/${input.folderId}`, {
      method: "DELETE",
      query: { recursive: input.recursive ?? false },
    });
    return { success: true, folderId: input.folderId };
  },
};

export default deleteFolder;
