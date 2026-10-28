import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface FolderCreateInput {
  accountId?: string;
  folderName: string;
  parentFolderId?: string;
}

interface FolderCreateOutput {
  folderId: string;
  folderName: string;
  path: string;
  folderType: string;
  imapAccess: boolean;
}

/**
 * `POST /api/accounts/{accountId}/folders` — "Create a New Folder". Zoho
 * documents `parentFolderId` and `parentFolderPath` as alternatives for
 * nesting under an existing folder; this action exposes only the id form
 * (`folder-list`'s own output), since a hand-typed path is one typo away
 * from creating a top-level folder instead of nesting one.
 */
const folderCreate: ActionDefinition<FolderCreateInput, FolderCreateOutput> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Add a new folder to the mailbox.",
  idempotent: false,
  params: [
    accountIdParam,
    {
      key: "folderName",
      label: "Folder name",
      type: "string",
      required: true,
      hint: "Letters and digits only — no special characters, per Zoho's own restriction.",
    },
    {
      key: "parentFolderId",
      label: "Parent folder ID",
      type: "string",
      hint: "Leave empty to create a top-level folder. Use Get Folders to find an id.",
    },
  ],
  output: [
    { key: "folderId", type: "string", label: "Folder ID" },
    { key: "folderName", type: "string", label: "Folder name" },
    { key: "path", type: "string", label: "Path" },
    { key: "folderType", type: "string", label: "Folder type" },
    { key: "imapAccess", type: "boolean", label: "IMAP access enabled" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const folder = await new ZohoMailClient(ctx).request<FolderCreateOutput>(
      `/accounts/${encodeURIComponent(accountId)}/folders`,
      {
        method: "POST",
        body: compact({ folderName: input.folderName, parentFolderId: input.parentFolderId }),
      },
    );
    if (!folder) throw new Error("Zoho Mail did not return the created folder");
    return folder;
  },
};

export default folderCreate;
