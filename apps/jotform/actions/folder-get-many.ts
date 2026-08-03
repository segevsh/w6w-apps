import type { ActionDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

/**
 * GET /user/folders — the account's form folders as a tree. The response is
 * the root folder object, with `forms` (the forms directly inside it) and
 * `subfolders` (the same shape, recursively).
 */
const folderGetMany: ActionDefinition<Record<string, never>> = {
  key: "folder-get-many",
  type: "read",
  resource: "folder",
  title: "Get Many Folders",
  description: "Retrieve the account's form-folder tree, with the forms in each folder.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Root folder ID" },
    { key: "name", type: "string", label: "Root folder name" },
    { key: "forms", type: "object", label: "Forms in this folder, keyed by form ID" },
    { key: "subfolders", type: "array", label: "Sub-folders" },
  ],

  execute(_input, ctx) {
    return new JotformClient(ctx).content<Record<string, unknown>>("/user/folders");
  },
};

export default folderGetMany;
