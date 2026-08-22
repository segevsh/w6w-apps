import type { Param } from "@w6w/types";

/** Paging, shared by every list action. */
export const LIST_PARAMS: Param[] = [
  {
    key: "returnAll",
    label: "Return All",
    type: "boolean",
    default: false,
    hint: "Page through every result. Off, only the first `limit` are returned.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    hint: "Maximum results when Return All is off. JumpCloud caps a single page at 100.",
    showIf: { "==": [{ var: "returnAll" }, false] },
  },
];

/**
 * `filter` and `sort`, the two query shapes JumpCloud's list endpoints share.
 *
 * `sort` is **space**-separated in JumpCloud's grammar, with a `-` prefix for
 * descending. This form takes it comma-separated like every other list action
 * in the pack and converts, because a comma-separated sort is not rejected — it
 * is read as one impossible field name and ignored, so the call succeeds and
 * comes back unsorted.
 */
export const FILTER_PARAMS: Param[] = [
  {
    key: "filter",
    label: "Filter",
    type: "string",
    default: "",
    placeholder: "email:$eq:ada@example.com",
    hint: "JumpCloud's filter grammar: `field:operator:value`, with `$eq`, `$ne`, `$gt`, " +
      "`$lt` and `$regex`.",
  },
  {
    key: "sort",
    label: "Sort By",
    type: "string",
    default: "",
    placeholder: "lastname, -created",
    hint: "Comma-separated field names, `-` for descending. Converted to JumpCloud's " +
      "space-separated form.",
  },
  {
    key: "fields",
    label: "Fields",
    type: "string",
    default: "",
    placeholder: "email, username, state",
    hint: "Comma-separated. Narrows what each record carries.",
  },
];
