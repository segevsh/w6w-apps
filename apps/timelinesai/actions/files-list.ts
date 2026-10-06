import type { ActionDefinition } from "@w6w/types";
import { TimelinesClient } from "../lib/client.ts";

interface Input {
  filename?: string;
}

const filesList: ActionDefinition<Input> = {
  key: "files-list",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "Files uploaded to the workspace (GET /files).",
  params: [
    {
      "key": "filename",
      "label": "Filename contains",
      "type": "string",
      "hint": "Case-insensitive part of a filename, e.g. an extension.",
    },
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Files: uid, filename, size, mimetype, uploaded_by_email, uploaded_at",
    },
  ],

  execute(input, ctx) {
    return new TimelinesClient(ctx).get("/files", { filename: input.filename });
  },
};

export default filesList;
