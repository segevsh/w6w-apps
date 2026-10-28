import type { ActionDefinition } from "@w6w/types";
import { WorkDriveClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
}

/** `GET /files/{resource_id}`. */
const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File or Folder",
  description: "Fetch a file or folder's metadata (name, type, size, parent, permalink).",
  params: [resourceId],
  output: [{ key: "item", type: "object", label: "File resource (JSON:API `data`)" }],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).get(
      `/files/${encodeURIComponent(input.resourceId)}`,
    );
    return { item: body.data ?? null };
  },
};

export default fileGet;
