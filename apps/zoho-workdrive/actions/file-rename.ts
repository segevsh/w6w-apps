import type { ActionDefinition } from "@w6w/types";
import { patchFile, WorkDriveClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
  name: string;
}

/** `PATCH /files/{resource_id}` with `attributes.name`. */
const fileRename: ActionDefinition<Input> = {
  key: "file-rename",
  type: "perform",
  resource: "file",
  title: "Rename File or Folder",
  description: "Rename a file or folder.",
  idempotent: true,
  params: [resourceId, { key: "name", label: "New Name", type: "string", required: true }],
  output: [{ key: "item", type: "object", label: "Updated resource (JSON:API `data`)" }],

  execute(input, ctx) {
    return patchFile(new WorkDriveClient(ctx), input.resourceId, { name: input.name });
  },
};

export default fileRename;
