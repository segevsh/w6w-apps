import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string | null;
  accessLevel?: "write" | "read" | null;
}

/** `POST /folders` — answers 201 with the folder. */
const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder to organise links and control who can edit them.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 190 },
    },
    { key: "description", label: "Description", type: "string", validation: { maxLength: 500 } },
    {
      key: "accessLevel",
      label: "Workspace access level",
      type: "select",
      options: [
        { value: "write", label: "Write (all members can edit)" },
        { value: "read", label: "Read (members can only view)" },
      ],
      hint: "Defaults to write.",
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
    return new DubClient(ctx).request("POST", "/folders", { body: compact({ ...input }) });
  },
};

export default folderCreate;
