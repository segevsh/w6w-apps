import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import fileList from "../actions/file-list.ts";
import { FOLDER_MIME } from "../lib/client.ts";
import {
  DRIVE_PARAM,
  FILE_OUTPUT,
  filesOf,
  fileVersionId,
  type FolderParams,
  folderQuery,
  PARENT_PARAM,
} from "../lib/triggers.ts";

/**
 * `file-list` restricted to folders, `modifiedTime desc`; the id carries the modified time so an
 * edited folder is a new event.
 */
const newOrUpdatedFolder = pollFromListAction<FolderParams>({
  key: "new-or-updated-folder",
  title: "New or Updated Folder",
  description:
    "Polls Google Drive for folders that were created or modified. The run gets the folder with its modified time.",
  action: fileList as ActionDefinition,
  input: (params) => ({
    q: folderQuery(params),
    driveId: params.driveId,
    pageSize: 100,
    orderBy: "modifiedTime desc",
  }),
  items: filesOf,
  idOf: fileVersionId,
  params: [PARENT_PARAM, DRIVE_PARAM],
  output: FILE_OUTPUT,
  sample: {
    id: "1Fo8dErAbC",
    name: "Invoices 2026",
    mimeType: FOLDER_MIME,
    createdTime: "2026-11-01T09:00:00Z",
    modifiedTime: "2026-11-10T09:30:00Z",
  },
});

export default newOrUpdatedFolder;
