import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  name: string;
  parentId?: string;
}

/** POST /workspaces/{workspaceId}/folders — create a folder, optionally nested. */
const folderCreate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder in a workspace, optionally nested under another folder.",
  // Names are not unique keys: replaying this makes a second folder.
  idempotent: false,
  params: [
    workspaceIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "parentId",
      label: "Parent folder ID",
      type: "string",
      hint: "Optional. Nests the new folder under an existing one in the same workspace.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "folder", type: "object", label: "The created folder" },
  ],

  async execute(input, ctx) {
    const folder = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/workspaces/${encodeURIComponent(input.workspaceId)}/folders`,
      { method: "POST", body: { name: input.name, parentId: input.parentId } },
    );
    return { id: folder?.id, name: folder?.name, folder };
  },
};

export default folderCreate;
