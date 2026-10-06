import type { ActionDefinition } from "@w6w/types";
import { patchFile, WorkDriveClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
}

/** `PATCH /files/{resource_id}` with `attributes.status = 1` (Active). */
const fileRestore: ActionDefinition<Input> = {
  key: "file-restore",
  type: "perform",
  resource: "file",
  title: "Restore from Trash",
  description: "Restore a trashed file or folder.",
  idempotent: true,
  params: [resourceId],
  output: [{ key: "item", type: "object", label: "Restored resource (JSON:API `data`)" }],

  execute(input, ctx) {
    return patchFile(new WorkDriveClient(ctx), input.resourceId, { status: "1" });
  },
};

export default fileRestore;
