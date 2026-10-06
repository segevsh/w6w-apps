import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient, encodePath } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
}

const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder at the given full path. The parent folder must already exist.",
  // Creating a folder that already exists is refused by Egnyte (405), so a
  // retry is not a no-op.
  idempotent: false,
  params: [pathParam("Full path of the new folder, e.g. /Shared/Reports/2026.")],
  output: [
    { key: "path", type: "string", label: "Path" },
    { key: "folder_id", type: "string", label: "Folder ID" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request(`/v1/fs/${encodePath(input.path)}`, {
      method: "POST",
      body: { action: "add_folder" },
    });
  },
};

export default folderCreate;
