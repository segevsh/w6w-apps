import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, WorkDriveClient } from "../lib/client.ts";

interface Input {
  sourceId: string;
  destinationFolderId: string;
}

/**
 * `POST /files/{destination_folder_id}/copy` — note the PATH id is the destination folder and
 * the source file/folder id travels in `attributes.resource_id`.
 */
const fileCopy: ActionDefinition<Input> = {
  key: "file-copy",
  type: "perform",
  resource: "file",
  title: "Copy File or Folder",
  description: "Copy a file or folder into a destination folder.",
  idempotent: false,
  params: [
    { key: "sourceId", label: "Source File or Folder ID", type: "string", required: true },
    { key: "destinationFolderId", label: "Destination Folder ID", type: "string", required: true },
  ],
  output: [{ key: "item", type: "object", label: "Copied resource(s) (JSON:API `data`)" }],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).request(
      "POST",
      `/files/${encodeURIComponent(input.destinationFolderId)}/copy`,
      { body: jsonApiBody("files", { resource_id: input.sourceId }) },
    );
    return { item: body.data ?? null };
  },
};

export default fileCopy;
