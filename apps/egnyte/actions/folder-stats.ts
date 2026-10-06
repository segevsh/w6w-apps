import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient } from "../lib/client.ts";

interface Input {
  folderId: string;
}

const folderStats: ActionDefinition<Input> = {
  key: "folder-stats",
  type: "read",
  resource: "folder",
  title: "Get Folder Statistics",
  description: "Total size and item counts for a folder, including all files and subfolders.",
  params: [{ key: "folderId", label: "Folder ID", type: "string", required: true }],
  output: [
    { key: "filesCount", type: "number", label: "Files" },
    { key: "foldersCount", type: "number", label: "Subfolders" },
    { key: "fileVersionsCount", type: "number", label: "File versions" },
    { key: "allFilesSize", type: "number", label: "Size of current versions (bytes)" },
    { key: "allVersionsSize", type: "number", label: "Size of all versions (bytes)" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request(
      `/v1/fs/ids/folder/${encodeURIComponent(input.folderId)}/stats`,
    );
  },
};

export default folderStats;
