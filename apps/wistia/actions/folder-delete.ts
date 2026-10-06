import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";
import { folderOutput } from "./folder-get.ts";

interface Input {
  folderId: string;
}

const folderDelete: ActionDefinition<Input> = {
  key: "folder-delete",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Delete a folder AND every media inside it.",
  idempotent: true,
  params: [{
    ...folderIdParam,
    hint: "Everything in this folder is deleted with it. Move media out first to keep it.",
  }],
  output: [...folderOutput],

  execute(input, ctx) {
    return new WistiaClient(ctx).json(`/folders/${encodeId(input.folderId)}`, {
      method: "DELETE",
    });
  },
};

export default folderDelete;
