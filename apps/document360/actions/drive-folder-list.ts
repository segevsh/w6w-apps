import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import { listOutput, projectIdParam } from "../lib/params.ts";

/** List all Drive folders as a tree (each folder carries sub_folders and an item count). */
interface Input {
  projectId?: string;
}

const driveFolderList: ActionDefinition<Input> = {
  key: "drive-folder-list",
  type: "read",
  resource: "drive",
  title: "List Drive Folders",
  description:
    "List all Drive folders as a tree (each folder carries sub_folders and an item count).",
  params: [projectIdParam],
  output: listOutput,

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.list(c.projectPath(input.projectId, "/drive/folders"));
  },
};

export default driveFolderList;
