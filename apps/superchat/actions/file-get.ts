import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/** Fetch one file by ID. */
const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Fetch one file by ID.",
  params: [
    { "key": "fileId", "label": "File ID", "type": "string", "required": true },
  ],
  output: [
    { "key": "id", "type": "string", "label": "ID" },
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "mime_type", "type": "string", "label": "MIME type" },
    { "key": "link", "type": "object", "label": "Time-limited download link" },
  ],

  execute(input, ctx) {
    return new SuperchatClient(ctx).request(`/files/${seg(input.fileId)}`);
  },
};

export default fileGet;
