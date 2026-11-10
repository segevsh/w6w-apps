import type { TriggerDefinition } from "@w6w/types";
import listMailFolders from "../actions/list-mail-folders.ts";
import { snapshotAdded } from "../lib/triggers.ts";

interface Params {
  parentFolderId?: string;
}

/**
 * `GET /me/mailFolders` or `GET /me/mailFolders/{id}/childFolders` — the same request as List Mail
 * Folders. Folders under one parent are few, so the list is read whole and compared with the last
 * check. https://learn.microsoft.com/en-us/graph/api/user-list-mailfolders (verified 2026-11-10).
 */
const newMailFolder: TriggerDefinition<Params> = {
  key: "new-mail-folder",
  title: "New Mail Folder",
  description:
    "Fires when a new mail folder is created at the top of the mailbox, or under a chosen parent folder. The run gets the folder's id, name, parent and counts.",
  params: [
    {
      key: "parentFolderId",
      label: "Parent folder",
      type: "string",
      hint:
        "Optional folder id or well-known name such as `inbox`. Empty watches the top level; set it to watch the subfolders of that folder.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "displayName", type: "string", label: "Name" },
    { key: "parentFolderId", type: "string", label: "Parent folder ID" },
    { key: "childFolderCount", type: "number", label: "Child folders" },
    { key: "totalItemCount", type: "number", label: "Items" },
  ],
  sample: {
    id: "AAMkAGI2...",
    displayName: "Invoices",
    parentFolderId: "AQMkADYAAAIBCAAAAA==",
    childFolderCount: 0,
    unreadItemCount: 0,
    totalItemCount: 0,
    isHidden: false,
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return snapshotAdded(
      listMailFolders,
      { parentFolderId: params.parentFolderId || undefined },
      state,
      ctx,
      "mail folders",
    );
  },
};

export default newMailFolder;
