import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  folderId: string;
  name: string;
}

/**
 * PATCH /workspaces/{workspaceId}/folders/{id} — rename a folder.
 *
 * `name` is the only documented mutable field; the folder cannot be re-parented
 * through this endpoint.
 */
const folderUpdate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "folder-update",
  type: "perform",
  resource: "folder",
  title: "Update Folder",
  description: "Rename a folder.",
  idempotent: true,
  params: [
    workspaceIdParam,
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Folders.",
    },
    { key: "name", label: "New name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "folder", type: "object", label: "The updated folder" },
  ],

  async execute(input, ctx) {
    const folder = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/folders/${
        encodeURIComponent(input.folderId)
      }`,
      { method: "PATCH", body: { name: input.name } },
    );
    return { id: folder?.id, name: folder?.name, folder };
  },
};

export default folderUpdate;
