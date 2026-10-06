import type { ActionDefinition } from "@w6w/types";
import { patchFile, WorkDriveClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
}

/** `PATCH /files/{resource_id}` with `attributes.status = 61` (Delete). NOT recoverable. */
const fileDeletePermanent: ActionDefinition<Input> = {
  key: "file-delete-permanent",
  type: "perform",
  resource: "file",
  title: "Delete Permanently",
  description: "Permanently delete a file or folder. This cannot be undone.",
  idempotent: true,
  params: [resourceId],
  output: [{ key: "item", type: "object", label: "Deleted resource (JSON:API `data`)" }],

  execute(input, ctx) {
    return patchFile(new WorkDriveClient(ctx), input.resourceId, { status: "61" });
  },
};

export default fileDeletePermanent;
