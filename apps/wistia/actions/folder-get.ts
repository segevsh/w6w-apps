import type { ActionDefinition } from "@w6w/types";
import { encodeId, WistiaClient } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";

interface Input {
  folderId: string;
}

export const folderOutput = [
  { key: "id", type: "number", label: "Numeric ID" },
  { key: "hashed_id", type: "string", label: "Hashed ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "description", type: "string", label: "Description" },
  { key: "media_count", type: "number", label: "Media count" },
  { key: "public", type: "boolean", label: "Public" },
  { key: "kind", type: "string", label: "library, shared or account" },
] as const;

const folderGet: ActionDefinition<Input> = {
  key: "folder-get",
  type: "read",
  resource: "folder",
  title: "Get Folder",
  description: "Fetch one folder (previously called a project) by its hashed ID.",
  params: [folderIdParam],
  output: [...folderOutput],

  execute(input, ctx) {
    return new WistiaClient(ctx).json(`/folders/${encodeId(input.folderId)}`);
  },
};

export default folderGet;
