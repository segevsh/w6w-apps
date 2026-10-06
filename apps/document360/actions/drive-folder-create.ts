import type { ActionDefinition } from "@w6w/types";
import { compact, Document360Client } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/** Create a Drive folder at the root or under a parent folder. */
interface Input {
  projectId?: string;
  name: string;
  parentFolderId?: string;
  folderColor?: string;
}

const driveFolderCreate: ActionDefinition<Input> = {
  key: "drive-folder-create",
  type: "perform",
  resource: "drive",
  title: "Create Drive Folder",
  description: "Create a Drive folder at the root or under a parent folder.",
  idempotent: false,
  params: [projectIdParam, { key: "name", label: "Name", type: "string", required: true }, {
    key: "parentFolderId",
    label: "Parent folder ID",
    type: "string",
    hint: "Empty creates a root-level folder.",
  }, { key: "folderColor", label: "Folder color", type: "string" }],
  output: [{ key: "id", type: "string", label: "Folder ID" }, {
    key: "title",
    type: "string",
    label: "Folder name",
  }, { key: "parent_folder_id", type: "string", label: "Parent folder ID" }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data("POST", c.projectPath(input.projectId, "/drive/folders"), {
      body: compact({
        name: input.name,
        parent_folder_id: input.parentFolderId,
        folder_color: input.folderColor,
      }),
    });
  },
};

export default driveFolderCreate;
