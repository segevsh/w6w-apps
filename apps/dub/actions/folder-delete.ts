import type { ActionDefinition } from "@w6w/types";
import { DubClient, seg } from "../lib/client.ts";

interface Input {
  folderId: string;
}

/** `DELETE /folders/{id}` — links keep working but leave the folder. */
const folderDelete: ActionDefinition<Input> = {
  key: "folder-delete",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Delete a folder. Its links keep working but are no longer in the folder.",
  idempotent: true,
  params: [{ key: "folderId", label: "Folder ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "ID of the deleted folder" }],

  execute(input, ctx) {
    return new DubClient(ctx).request("DELETE", `/folders/${seg(input.folderId)}`);
  },
};

export default folderDelete;
