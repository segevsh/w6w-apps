import type { OutputField, Param } from "@w6w/types";
import { FOLDER_MIME } from "./client.ts";

/** Google Drive ids are URL-safe base64-like strings; anything else cannot be put in a `q`. */
const DRIVE_ID = /^[A-Za-z0-9_-]+$/;

export function fileId(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (typeof id !== "string" || id === "") throw new Error("Google Drive file has no id");
  return id;
}

/** `id:modifiedTime`, so an edit of a file already seen is a new event (brief section 9.2). */
export function fileVersionId(item: unknown): string {
  const modified = (item as { modifiedTime?: unknown }).modifiedTime;
  return `${fileId(item)}:${typeof modified === "string" ? modified : ""}`;
}

/** A trimmed Drive id, or `undefined` when blank; throws on anything that is not an id. */
export function idParam(value: string | undefined, label: string): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (!DRIVE_ID.test(v)) throw new Error(`${label} is not a Google Drive id.`);
  return v;
}

export const filesOf = (result: unknown): unknown[] =>
  (result as { files?: unknown[] }).files ?? [];

export const FILE_OUTPUT: OutputField[] = [
  { key: "id", label: "File ID", type: "string" },
  { key: "name", label: "Name", type: "string" },
  { key: "mimeType", label: "MIME type", type: "string" },
  { key: "createdTime", label: "Created time", type: "string" },
  { key: "modifiedTime", label: "Modified time", type: "string" },
];

export const Q_PARAM: Param = {
  key: "q",
  label: "Query",
  type: "string",
  hint: "Google Drive `q` search syntax, e.g. `mimeType = 'application/pdf'`.",
};

export const DRIVE_PARAM: Param = {
  key: "driveId",
  label: "Shared drive ID",
  type: "string",
  hint: "Leave empty for My Drive and files shared with you.",
};

export const PARENT_PARAM: Param = {
  key: "parentFolderId",
  label: "Parent Folder ID",
  type: "string",
};

export type FolderParams = { driveId?: string; parentFolderId?: string };

/** The `q` for "folders (directly inside `parentFolderId`)"; `file-list` adds `trashed = false`. */
export function folderQuery(params: FolderParams): string {
  const clauses = [`mimeType = '${FOLDER_MIME}'`];
  const parent = idParam(params.parentFolderId, "Parent folder ID");
  if (parent) clauses.push(`'${parent}' in parents`);
  return clauses.join(" and ");
}
