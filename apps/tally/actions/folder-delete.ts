import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  folderId: string;
}

/** DELETE /workspaces/{workspaceId}/folders/{id} — delete a folder. Responds 204. */
const folderDelete: ActionDefinition<Input, Record<string, unknown>> = {
  key: "folder-delete",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Delete a folder from a workspace.",
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
  ],
  output: [
    { key: "folderId", type: "string", label: "Deleted folder ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "deleting Tally folder", { folderId: input.folderId });
    await new TallyClient(ctx).request(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/folders/${
        encodeURIComponent(input.folderId)
      }`,
      { method: "DELETE" },
    );
    return { folderId: input.folderId, deleted: true };
  },
};

export default folderDelete;
