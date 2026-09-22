import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Firestore actions.
 *
 * `projectId` and `databaseId` are collected on the Connection
 * (`auth/oauth2.ts`) because every single Firestore path begins with them; each
 * action still takes them as overrides so one workflow can reach two projects.
 */

export const PROJECT_PARAM: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  default: "",
  placeholder: "my-gcp-project",
  hint: "Leave blank to use the project on the connection.",
};

export const DATABASE_PARAM: Param = {
  key: "databaseId",
  label: "Database ID",
  type: "string",
  default: "",
  placeholder: "(default)",
  hint: "Leave blank for the project's `(default)` database. Only named databases differ.",
};

/** A document, addressed the way the API addresses one: a resource path. */
export const DOCUMENT_PATH_PARAM: Param = {
  key: "path",
  label: "Document Path",
  type: "string",
  required: true,
  placeholder: "users/alice/orders/o1",
  hint: "Path under `…/documents` — collection/document/collection/document. A full " +
    "`projects/…` resource name is accepted too.",
};

/** A collection, addressed as the path down to it. */
export const COLLECTION_PATH_PARAM: Param = {
  key: "collectionPath",
  label: "Collection Path",
  type: "string",
  required: true,
  placeholder: "users/alice/orders",
  hint: "Path under `…/documents` — `users` for a top-level collection, or " +
    "`users/alice/orders` for a subcollection.",
};

/** A single collection id — the segment after a parent. */
export const COLLECTION_ID_PARAM: Param = {
  key: "collectionId",
  label: "Collection ID",
  type: "string",
  required: true,
  placeholder: "cities",
  hint: "The collection's own id. For a subcollection this is the last `collectionPath` " +
    "segment, with `parentPath` naming the document above it.",
};

/**
 * The document a subcollection/collection-group query hangs off. Blank means the
 * database root, which is where a top-level collection lives.
 */
export const PARENT_PATH_PARAM: Param = {
  key: "parentPath",
  label: "Parent Document Path",
  type: "string",
  default: "",
  placeholder: "users/alice",
  hint: "Blank for a top-level collection. With `allDescendants`, a collection-group query " +
    "matches this collection id anywhere under the parent.",
};

/** `pageSize` / `pageToken`, shared by the listing actions. */
export const PAGING_PARAMS: Param[] = [
  {
    key: "pageSize",
    label: "Page Size",
    type: "number",
    default: 50,
    hint: "Maximum documents in this page. Firestore may return fewer.",
  },
  {
    key: "pageToken",
    label: "Page Token",
    type: "string",
    default: "",
    hint: "`nextPageToken` from the previous page. Blank starts at the beginning.",
  },
];

/**
 * `mask.fieldPaths`, written as a comma-separated list because the wire form is
 * a *repeated* query parameter and a form cannot express that directly.
 */
export const MASK_PARAM: Param = {
  key: "mask",
  label: "Field Mask",
  type: "string",
  default: "",
  placeholder: "name, address.city",
  hint: "Comma-separated field paths to read or write. Blank means the whole document.",
};

/** `readTime`, the point-in-time read knob. */
export const READ_TIME_PARAM: Param = {
  key: "readTime",
  label: "Read Time",
  type: "string",
  default: "",
  placeholder: "2026-09-22T10:00:00Z",
  hint: "Read as of this RFC3339 time. Must be microsecond precision, within the last hour " +
    "(or a whole minute within 7 days with point-in-time recovery).",
};

/** Split a comma-separated field-path list, or `undefined` when blank. */
export function fieldPaths(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.map((v) => String(v).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const items = value.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** True when the caller supplied something at all — `false` is a real value. */
export function isSet(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}
