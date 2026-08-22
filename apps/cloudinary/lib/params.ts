import type { Param } from "@w6w/types";
import { RESOURCE_TYPES } from "./client.ts";

/**
 * `resource_type` — which half of the library an action is working in.
 *
 * It is a **path segment** on almost every route, not a filter, so getting it
 * wrong does not return the wrong results: it returns none, or a 404. Video and
 * audio share `video`; everything Cloudinary does not decode is `raw`.
 */
export const RESOURCE_TYPE_PARAM: Param = {
  key: "resourceType",
  label: "Resource Type",
  type: "select",
  default: "image",
  options: RESOURCE_TYPES,
  hint: "A path segment, not a filter — audio lives under `video`, and anything Cloudinary does " +
    "not decode is `raw`.",
};

/**
 * `type` — the *delivery* type, which Cloudinary also calls the storage type.
 *
 * `upload` is the public default. `private` and `authenticated` assets are not
 * reachable by a plain delivery URL, which is the whole point of them — and the
 * reason `asset-url` cannot produce a working URL for either.
 */
export const DELIVERY_TYPE_PARAM: Param = {
  key: "type",
  label: "Delivery Type",
  type: "select",
  default: "upload",
  options: [
    { value: "upload", label: "Upload — publicly deliverable" },
    { value: "private", label: "Private — needs a signed URL" },
    { value: "authenticated", label: "Authenticated — needs a signed URL or token" },
    { value: "fetch", label: "Fetch — a remote URL Cloudinary proxies" },
  ],
  hint: "Public assets are `upload`. Private and authenticated assets cannot be delivered by an " +
    "unsigned URL, which is what they are for.",
};

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result with `next_cursor`.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Maximum results when Return All is off. Cloudinary's page size caps at 500.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];
