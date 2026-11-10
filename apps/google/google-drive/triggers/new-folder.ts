import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import fileList from "../actions/file-list.ts";
import { FOLDER_MIME } from "../lib/client.ts";
import {
  DRIVE_PARAM,
  FILE_OUTPUT,
  fileId,
  filesOf,
  type FolderParams,
  folderQuery,
  PARENT_PARAM,
} from "../lib/triggers.ts";

/**
 * `file-list` restricted to folders, `createdTime desc` (the same query as `folder-list`, which
 * has no sort): https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
 */
const newFolder = pollFromListAction<FolderParams>({
  key: "new-folder",
  title: "New Folder",
  description: "Polls Google Drive for newly created folders. The run gets the new folder.",
  action: fileList as ActionDefinition,
  input: (params) => ({
    q: folderQuery(params),
    driveId: params.driveId,
    pageSize: 100,
    orderBy: "createdTime desc",
  }),
  items: filesOf,
  idOf: fileId,
  params: [PARENT_PARAM, DRIVE_PARAM],
  output: FILE_OUTPUT,
  sample: {
    id: "1Fo8dErAbC",
    name: "Invoices 2026",
    mimeType: FOLDER_MIME,
    createdTime: "2026-11-10T09:00:00Z",
    modifiedTime: "2026-11-10T09:00:00Z",
  },
});

export default newFolder;
