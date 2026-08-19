import type { Param } from "@w6w/types";

/**
 * The container. An account holds containers and a container holds blobs —
 * that is the whole hierarchy, and a container cannot hold another container.
 */
export const CONTAINER_PARAM: Param = {
  key: "container",
  label: "Container",
  type: "string",
  required: true,
  default: "",
  placeholder: "uploads",
  hint: "Lowercase letters, digits and single hyphens. Azure rejects uppercase outright.",
};

/** The blob's full name. Slashes in it are ordinary characters. */
export const BLOB_PARAM: Param = {
  key: "blob",
  label: "Blob",
  type: "string",
  required: true,
  default: "",
  placeholder: "logs/2026/08/app.log",
  hint: "The full name including slashes — there are no folders, only names that contain them.",
};

/** Azure pages with an opaque marker rather than a page number. */
export const PAGE_PARAMS: Param[] = [
  {
    key: "maxResults",
    label: "Page Size",
    type: "number",
    default: 100,
    hint: "Up to 5000. Azure may return fewer and still give a marker.",
  },
  {
    key: "marker",
    label: "Marker",
    type: "string",
    default: "",
    hint: "The `nextMarker` from the previous call. Opaque.",
  },
];
