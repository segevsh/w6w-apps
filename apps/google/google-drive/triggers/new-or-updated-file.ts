import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import fileList from "../actions/file-list.ts";
import {
  DRIVE_PARAM,
  FILE_OUTPUT,
  fileId,
  filesOf,
  fileVersionId,
  idParam,
  Q_PARAM,
} from "../lib/triggers.ts";

type Params = { q?: string; driveId?: string; folderId?: string; fileId?: string };

/**
 * Files or folders created or modified since the last check: `files.list` sorted
 * `modifiedTime desc` (https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list).
 * A file counts as modified when it is created, so this also fires for new files. `fileId` keeps
 * only that file from the page (a modified file is always at its top).
 */
const base = pollFromListAction<Params>({
  key: "new-or-updated-file",
  title: "New or Updated File",
  description:
    "Polls Google Drive for files and folders that were created or modified. Narrow it to one folder or one file. The run gets the file with its modified time.",
  action: fileList as ActionDefinition,
  input: (params) => {
    const folder = idParam(params.folderId, "Folder ID");
    // The user's own query is parenthesised so an `or` inside it cannot widen past the folder clause.
    const userQ = params.q?.trim();
    const inFolder = folder ? `'${folder}' in parents` : undefined;
    const q = userQ && inFolder ? `(${userQ}) and ${inFolder}` : userQ || inFolder;
    return {
      q: q || undefined,
      driveId: params.driveId,
      pageSize: 100,
      orderBy: "modifiedTime desc",
    };
  },
  items: filesOf,
  idOf: fileVersionId,
  params: [
    Q_PARAM,
    DRIVE_PARAM,
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint: "Only files directly inside this folder.",
    },
    { key: "fileId", label: "File ID", type: "string", hint: "Only changes to this one file." },
  ],
  output: FILE_OUTPUT,
  sample: {
    id: "1Jw4r9eKzTQX2d",
    name: "Quarterly plan",
    mimeType: "application/vnd.google-apps.document",
    createdTime: "2026-11-01T12:00:00Z",
    modifiedTime: "2026-11-10T08:30:00Z",
  },
});

const newOrUpdatedFile: TriggerDefinition<Params> = {
  ...base,
  async poll(input, ctx) {
    // Validate the id before any request; the dedupe state still tracks every listed file.
    const only = idParam(input.params?.fileId, "File ID");
    const result = await base.poll!(input as never, ctx);
    return only ? { ...result, events: result.events.filter((e) => fileId(e) === only) } : result;
  },
};

export default newOrUpdatedFile;
