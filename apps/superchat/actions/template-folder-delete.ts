import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  folderId: string;
}

/** Delete a template folder. This cannot be undone. */
const templateFolderDelete: ActionDefinition<Input> = {
  key: "template-folder-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template Folder",
  description: "Delete a template folder. This cannot be undone.",
  idempotent: true,
  params: [
    { "key": "folderId", "label": "Template folder ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/template-folders/${seg(input.folderId)}`, {
      method: "DELETE",
    });
  },
};

export default templateFolderDelete;
