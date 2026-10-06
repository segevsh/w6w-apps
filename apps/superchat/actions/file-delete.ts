import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/** Delete a file. This cannot be undone. */
const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete a file. This cannot be undone.",
  idempotent: true,
  params: [
    { "key": "fileId", "label": "File ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID of the deleted object" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/files/${seg(input.fileId)}`, { method: "DELETE" });
  },
};

export default fileDelete;
