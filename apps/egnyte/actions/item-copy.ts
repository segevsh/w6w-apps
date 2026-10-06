import type { ActionDefinition } from "@w6w/types";
import { compact, EgnyteClient, encodePath } from "../lib/client.ts";
import { pathParam } from "../lib/params.ts";

interface Input {
  path: string;
  destination: string;
  permissions?: string;
  folderOptionsMode?: string;
}

const itemCopy: ActionDefinition<Input> = {
  key: "item-copy",
  type: "perform",
  resource: "item",
  title: "Copy File or Folder",
  description:
    "Copy a file or folder to a new absolute path. If the destination does not include the original folder name, only the folder's contents are copied.",
  idempotent: false,
  params: [
    pathParam("Full path of the file or folder to copy."),
    {
      key: "destination",
      label: "Destination",
      type: "string",
      required: true,
      placeholder: "/Shared/Archive/report.pdf",
      hint: "Full absolute destination path, including the new name.",
    },
    {
      key: "permissions",
      label: "Permissions",
      type: "select",
      advanced: true,
      options: [
        { value: "keep_original", label: "Keep original" },
        { value: "inherit_from_parent", label: "Inherit from parent" },
      ],
      hint: "If omitted, the workgroup setting applies.",
    },
    {
      key: "folderOptionsMode",
      label: "Folder options",
      type: "select",
      advanced: true,
      options: [
        { value: "keep_source", label: "Keep source" },
        { value: "apply_destination", label: "Apply destination" },
      ],
      hint: "If omitted, the workgroup setting applies.",
    },
  ],
  output: [
    { key: "path", type: "string", label: "New path" },
    { key: "group_id", type: "string", label: "File ID" },
    { key: "folder_id", type: "string", label: "Folder ID" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request(`/v1/fs/${encodePath(input.path)}`, {
      method: "POST",
      body: compact({
        action: "copy",
        destination: input.destination,
        permissions: input.permissions,
        folder_options_mode: input.folderOptionsMode,
      }),
    });
  },
};

export default itemCopy;
