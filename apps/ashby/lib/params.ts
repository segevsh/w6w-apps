import type { Param } from "@w6w/types";

/**
 * Paging and incremental sync, shared by the `.list` actions.
 *
 * The sync token is the interesting one: Ashby returns it on the **last page**
 * only, so it is present when a walk finished and absent when it was cut short.
 */
export const LIST_PARAMS: Param[] = [
  {
    key: "syncToken",
    label: "Sync Token",
    type: "string",
    default: "",
    hint: "From a previous run's output. Returns only records changed since then — the cheap " +
      "way to poll. Leave blank for a full sync.",
  },
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page to the end. Required to receive a sync token, which Ashby only sends on the " +
      "last page.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    showIf: { "==": [{ var: "returnAll" }, false] },
    hint: "Ashby caps a page at 100.",
  },
  {
    key: "maxPages",
    label: "Maximum Pages",
    type: "number",
    default: 50,
    advanced: true,
    showIf: { "==": [{ var: "returnAll" }, true] },
    hint: "A ceiling on the paging loop. Hitting it means no sync token this run.",
  },
];

/** Ashby filters take Unix milliseconds; this app accepts a date and converts. */
export const CREATED_AFTER_PARAM: Param = {
  key: "createdAfter",
  label: "Created After",
  type: "datetime",
  default: "",
  hint: "Ashby wants Unix milliseconds here; a date is converted for you.",
};
