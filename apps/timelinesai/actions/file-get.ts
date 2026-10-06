import type { ActionDefinition } from "@w6w/types";
import { seg, TimelinesClient } from "../lib/client.ts";

interface Input {
  fileUid: string;
}

const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description:
    "A file's details and a temporary download URL, valid for 15 minutes (GET /files/{file_uid}).",
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
    {
      key: "data",
      type: "object",
      label: "The file: uid, filename, size, mimetype, temporary_download_url",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get(`/files/${seg(input.fileUid)}`);
  },
};

export default fileGet;
