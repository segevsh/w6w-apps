import type { ActionDefinition } from "@w6w/types";
import { patchFile, WorkDriveClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
  parentId: string;
}

/** `PATCH /files/{resource_id}` with `attributes.parent_id` (the destination folder). */
const fileMove: ActionDefinition<Input> = {
  key: "file-move",
  type: "perform",
  resource: "file",
  title: "Move File or Folder",
  description: "Move a file or folder into another folder or team folder.",
  idempotent: true,
  params: [
    resourceId,
    { key: "parentId", label: "Destination Folder ID", type: "string", required: true },
  ],
  output: [{ key: "item", type: "object", label: "Moved resource (JSON:API `data`)" }],

  execute(input, ctx) {
    return patchFile(new WorkDriveClient(ctx), input.resourceId, { parent_id: input.parentId });
  },
};

export default fileMove;
