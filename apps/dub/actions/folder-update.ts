import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient, seg } from "../lib/client.ts";

interface Input {
  folderId: string;
  name?: string;
  description?: string | null;
  accessLevel?: "write" | "read" | null;
}

/** `PATCH /folders/{id}`. */
const folderUpdate: ActionDefinition<Input> = {
  key: "folder-update",
  type: "perform",
  resource: "folder",
  title: "Update Folder",
  description: "Rename a folder or change its description or access level.",
  idempotent: true,
  params: [
    { key: "folderId", label: "Folder ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", validation: { maxLength: 190 } },
    { key: "description", label: "Description", type: "string", validation: { maxLength: 500 } },
    {
      key: "accessLevel",
      label: "Workspace access level",
      type: "select",
      options: [
        { value: "write", label: "Write (all members can edit)" },
        { value: "read", label: "Read (members can only view)" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "accessLevel", type: "string", label: "Workspace access level (write or read)" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  execute(input, ctx) {
    const { folderId, ...rest } = input;
    return new DubClient(ctx).request("PATCH", `/folders/${seg(folderId)}`, {
      body: compact({ ...rest }),
    });
  },
};

export default folderUpdate;
