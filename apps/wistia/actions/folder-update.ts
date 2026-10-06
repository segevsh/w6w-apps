import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, WistiaClient } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";
import { folderOutput } from "./folder-get.ts";

interface Input {
  folderId: string;
  name?: string;
  description?: string;
  public?: boolean;
  anonymousCanUpload?: boolean;
  anonymousCanDownload?: boolean;
}

const folderUpdate: ActionDefinition<Input> = {
  key: "folder-update",
  type: "perform",
  resource: "folder",
  title: "Update Folder",
  description: "Rename a folder or change its description and sharing flags.",
  idempotent: true,
  params: [
    folderIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "public", label: "Public", type: "boolean" },
    { key: "anonymousCanUpload", label: "Anonymous can upload", type: "boolean" },
    { key: "anonymousCanDownload", label: "Anonymous can download", type: "boolean" },
  ],
  output: [...folderOutput],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      description: input.description,
      public: input.public,
      anonymousCanUpload: input.anonymousCanUpload,
      anonymousCanDownload: input.anonymousCanDownload,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("folder-update needs at least one field to change");
    }
    return new WistiaClient(ctx).json(`/folders/${encodeId(input.folderId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default folderUpdate;
