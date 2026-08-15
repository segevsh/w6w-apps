import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface FolderListInput {
  accountId?: string;
}

interface FolderOutputItem {
  folderId: string;
  folderName: string;
  path: string;
  folderType: string;
  imapAccess: boolean;
  isArchived: number;
}

/** `GET /api/accounts/{accountId}/folders` — "Get all Folders". */
const folderList: ActionDefinition<FolderListInput, FolderOutputItem[]> = {
  key: "folder-list",
  type: "read",
  resource: "folder",
  title: "Get Folders",
  description: "List every folder in the mailbox — Inbox, Sent, Trash, and any custom folders.",
  params: [accountIdParam],
  output: [
    { key: "folderId", type: "string", label: "Folder ID" },
    { key: "folderName", type: "string", label: "Folder name" },
    { key: "path", type: "string", label: "Path" },
    { key: "folderType", type: "string", label: "Folder type" },
    { key: "imapAccess", type: "boolean", label: "IMAP access enabled" },
    { key: "isArchived", type: "number", label: "Archived (1) or not (0)" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const folders = await new ZohoMailClient(ctx).request<FolderOutputItem[]>(
      `/accounts/${encodeURIComponent(accountId)}/folders`,
    );
    return folders ?? [];
  },
};

export default folderList;
