import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import driveList from "../actions/drive-list.ts";
import fileList from "../actions/file-list.ts";
import { FOLDER_MIME } from "./client.ts";

/** Google Drive ids are URL-safe base64-like strings; anything else cannot be put in a `q`. */
const DRIVE_ID = /^[A-Za-z0-9_-]+$/;

export function fileId(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (typeof id !== "string" || id === "") throw new Error("Google Drive file has no id");
  return id;
}

/** `id:modifiedTime`, so an edit of a file already seen is a new event (brief §9.2). */
export function fileVersionId(item: unknown): string {
  const modified = (item as { modifiedTime?: unknown }).modifiedTime;
  return `${fileId(item)}:${typeof modified === "string" ? modified : ""}`;
}

export function idParam(value: string | undefined, label: string): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (!DRIVE_ID.test(v)) throw new Error(`${label} is not a Google Drive id.`);
  return v;
}

const FILE_OUTPUT: OutputField[] = [
  { key: "id", label: "File ID", type: "string" },
  { key: "name", label: "Name", type: "string" },
  { key: "mimeType", label: "MIME type", type: "string" },
  { key: "createdTime", label: "Created time", type: "string" },
  { key: "modifiedTime", label: "Modified time", type: "string" },
];

const Q_PARAM: Param = {
  key: "q",
  label: "Query",
  type: "string",
  hint: "Google Drive `q` search syntax, e.g. `mimeType = 'application/pdf'`.",
};
const DRIVE_PARAM: Param = {
  key: "driveId",
  label: "Shared drive ID",
  type: "string",
  hint: "Leave empty for My Drive and files shared with you.",
};

type FileParams = { q?: string; driveId?: string; folderId?: string; fileId?: string };
type FolderParams = { driveId?: string; parentFolderId?: string; nameContains?: string };

const items = (result: unknown) => (result as { files?: unknown[] }).files ?? [];

function folderQuery(params: FolderParams): string {
  const clauses = [`mimeType = '${FOLDER_MIME}'`];
  const parent = idParam(params.parentFolderId, "Parent folder ID");
  if (parent) clauses.push(`'${parent}' in parents`);
  return clauses.join(" and ");
}

/**
 * Files or folders created or modified since the last check: `files.list` sorted
 * `modifiedTime desc` (https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list).
 * A file created counts as modified at creation, so this also fires for new files.
 * `fileId` keeps only that file from the page (a modified file is always at its top).
 */
const newOrUpdatedFileBase = pollFromListAction<FileParams>({
  key: "new-or-updated-file",
  title: "New or Updated File",
  description:
    "Polls Google Drive for files and folders that were created or modified. Narrow it to one folder or one file. The run gets the file with its modified time.",
  action: fileList,
  input: (params) => {
    const folder = idParam(params.folderId, "Folder ID");
    const q = [params.q?.trim(), folder ? `'${folder}' in parents` : undefined]
      .filter(Boolean).join(" and ");
    return {
      q: q || undefined,
      driveId: params.driveId,
      pageSize: 100,
      orderBy: "modifiedTime desc",
    };
  },
  items: (result) => items(result),
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
    {
      key: "fileId",
      label: "File ID",
      type: "string",
      hint: "Only changes to this one file.",
    },
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

export const newOrUpdatedFile: TriggerDefinition<FileParams> = {
  ...newOrUpdatedFileBase,
  async poll(input, ctx) {
    // Validate the id before any request; the dedupe state still tracks every listed file.
    const only = idParam(input.params?.fileId, "File ID");
    const result = await newOrUpdatedFileBase.poll!(input as never, ctx);
    return only ? { ...result, events: result.events.filter((e) => fileId(e) === only) } : result;
  },
};

export const newFolder: TriggerDefinition<FolderParams> = pollFromListAction<FolderParams>({
  key: "new-folder",
  title: "New Folder",
  description: "Polls Google Drive for newly created folders. The run gets the new folder.",
  action: fileList,
  input: (params) => ({
    q: folderQuery(params),
    driveId: params.driveId,
    pageSize: 100,
    orderBy: "createdTime desc",
  }),
  items: (result) => items(result),
  idOf: fileId,
  params: [
    { key: "parentFolderId", label: "Parent Folder ID", type: "string" },
    DRIVE_PARAM,
  ],
  output: FILE_OUTPUT,
  sample: {
    id: "1Fo8dErAbC",
    name: "Invoices 2026",
    mimeType: FOLDER_MIME,
    createdTime: "2026-11-10T09:00:00Z",
    modifiedTime: "2026-11-10T09:00:00Z",
  },
});

export const newOrUpdatedFolder: TriggerDefinition<FolderParams> = pollFromListAction<FolderParams>(
  {
    key: "new-or-updated-folder",
    title: "New or Updated Folder",
    description:
      "Polls Google Drive for folders that were created or modified. The run gets the folder with its modified time.",
    action: fileList,
    input: (params) => ({
      q: folderQuery(params),
      driveId: params.driveId,
      pageSize: 100,
      orderBy: "modifiedTime desc",
    }),
    items: (result) => items(result),
    idOf: fileVersionId,
    params: [
      { key: "parentFolderId", label: "Parent Folder ID", type: "string" },
      DRIVE_PARAM,
    ],
    output: FILE_OUTPUT,
    sample: {
      id: "1Fo8dErAbC",
      name: "Invoices 2026",
      mimeType: FOLDER_MIME,
      createdTime: "2026-11-01T09:00:00Z",
      modifiedTime: "2026-11-10T09:30:00Z",
    },
  },
);

const DRIVE_PAGE = 100;
const DRIVE_MAX_PAGES = 5;

/**
 * Shared drives the connected user can see: `drives.list` is a bounded collection (a user belongs
 * to few shared drives), read up to five pages of 100 and compared with the last check. More than
 * 500 shared drives fails the check with a clear error rather than dropping entries.
 * https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/list
 */
export const newSharedDrive: TriggerDefinition<Record<string, never>> = {
  key: "new-shared-drive",
  title: "New Shared Drive",
  description:
    "Polls the shared drives the connected account can see and fires for each new one. The run gets the shared drive.",
  output: [
    { key: "id", label: "Shared drive ID", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "createdTime", label: "Created time", type: "string" },
  ],
  sample: {
    kind: "drive#drive",
    id: "0AIvKq2xTPtbOUk9PVA",
    name: "Finance",
    createdTime: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const drives: Array<Record<string, unknown>> = [];
    let pageToken: string | undefined;
    for (let page = 0; page < DRIVE_MAX_PAGES; page++) {
      const result = await (driveList as ActionDefinition).execute(
        { pageSize: DRIVE_PAGE, pageToken },
        ctx,
      ) as { drives?: Array<Record<string, unknown>>; nextPageToken?: string };
      drives.push(...(result.drives ?? []));
      if (!result.nextPageToken) break;
      if (page === DRIVE_MAX_PAGES - 1) {
        throw new Error(
          `Google Drive lists more than ${
            DRIVE_PAGE * DRIVE_MAX_PAGES
          } shared drives; too many to poll`,
        );
      }
      pageToken = result.nextPageToken;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: drives.map((d) => ({ key: fileId(d), values: { name: d.name } })),
      emit: { added: true, updated: false },
    });
    const byKey = new Map(drives.map((d) => [fileId(d), d]));
    return { events: events.map((c) => byKey.get(c.key) ?? c.values), nextState };
  },
};
