import type { ActionDefinition } from "@w6w/types";
import { BoxClient } from "../lib/client.ts";

interface Input {
  name: string;
  parentId?: string;
}

/**
 * Create a folder. `parentId` defaults to `"0"`, Box's id for the root
 * folder.
 *
 * https://developer.box.com/reference/post-folders/
 */
const createFolder: ActionDefinition<Input> = {
  key: "create-folder",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder inside a parent folder.",
  idempotent: false,
  params: [
    { key: "name", label: "Folder Name", type: "string", required: true },
    {
      key: "parentId",
      label: "Parent Folder ID",
      type: "string",
      default: "0",
      hint: 'Box folder ID to create the new folder in. "0" (the default) is the root folder.',
    },
  ],

  execute(input, ctx) {
    const client = new BoxClient(ctx);
    return client.request("/folders", {
      method: "POST",
      body: {
        name: input.name,
        parent: { id: input.parentId ?? "0" },
      },
    });
  },
};

export default createFolder;
