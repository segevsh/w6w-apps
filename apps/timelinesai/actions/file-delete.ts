import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  fileUid: string;
}

const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  idempotent: true,
  resource: "file",
  title: "Delete File",
  description: "Delete an uploaded file (DELETE /files/{file_uid}).",
  params: [
    {
      "key": "fileUid",
      "label": "File UID",
      "type": "string",
      "required": true,
      "hint": "From List Files or Upload File from URL.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "ok on success" },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).delete(`/files/${seg(input.fileUid)}`);
  },
};

export default fileDelete;
