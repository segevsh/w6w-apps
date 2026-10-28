import type { Param } from "@w6w/types";

/** The two params every list action shares. */
export const LIST_PARAMS: Param[] = [
  { key: "returnAll", label: "Return All", type: "boolean", default: false },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Max number of results when Return All is off.",
  },
];

/**
 * Which representation a `body` field is read back in. Confluence stores
 * `storage` (its own XHTML), so that is the default: a read-edit-write round
 * trip through any other format is lossy.
 */
export const BODY_FORMAT_PARAM: Param = {
  key: "bodyFormat",
  label: "Body Format",
  type: "select",
  default: "",
  options: [
    { value: "storage", label: "Storage (XHTML)" },
    { value: "atlas_doc_format", label: "Atlassian Document Format" },
    { value: "view", label: "View (rendered HTML)" },
  ],
  hint: "Leave blank to omit the body from the response entirely.",
};
