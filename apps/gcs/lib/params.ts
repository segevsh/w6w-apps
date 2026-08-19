import type { Param } from "@w6w/types";

/** The bucket. Globally unique across all of Google Cloud, so a name is an id. */
export const BUCKET_PARAM: Param = {
  key: "bucket",
  label: "Bucket",
  type: "string",
  required: true,
  default: "",
  placeholder: "my-bucket",
  hint: "The name alone. A `gs://` URI is accepted and stripped; a path is not.",
};

/**
 * The object's full name, slashes included.
 *
 * There is no folder to give separately — `logs/2026/app.log` is the whole
 * name of one object.
 */
export const OBJECT_PARAM: Param = {
  key: "object",
  label: "Object",
  type: "string",
  required: true,
  default: "",
  placeholder: "logs/2026/08/app.log",
  hint: "The full name including slashes. Folders do not exist; the slashes are just characters " +
    "in the name.",
};

/** Paging, which is a token rather than a page number. */
export const PAGE_PARAMS: Param[] = [
  {
    key: "maxResults",
    label: "Page Size",
    type: "number",
    default: 100,
    hint: "Up to 1000.",
  },
  {
    key: "pageToken",
    label: "Page Token",
    type: "string",
    default: "",
    hint: "The `nextPageToken` from the previous call. Opaque.",
  },
];
