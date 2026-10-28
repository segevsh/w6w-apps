/**
 * Param fragments shared by the actions.
 *
 * Every Excel action addresses a workbook the same way and may carry the same
 * session header, so declaring those fields once keeps sixteen actions honest
 * with each other. Each helper returns a fresh array, so an action can splice in
 * its own fields without mutating a shared object.
 *
 * These are plain data — evaluated at import time, so `describe()` still sees a
 * concrete `Param[]` on every action.
 */
import type { Param } from "@w6w/types";

/**
 * The two documented ways to point at a workbook. Exactly one must be set.
 *
 * Neither is marked `required`, because "one or the other" is not a constraint a
 * single `required` flag can express; the client raises a legible error instead.
 */
export function workbookParams(): Param[] {
  return [
    {
      key: "itemId",
      label: "Workbook item ID",
      type: "string",
      placeholder: "01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN",
      hint:
        "driveItem id of the .xlsx file — `/me/drive/items/{id}/workbook`. Use List Workbooks to find it. Set this **or** File path, not both.",
    },
    {
      key: "itemPath",
      label: "File path",
      type: "string",
      placeholder: "Reports/Q3.xlsx",
      hint:
        "Path relative to the drive root — `/me/drive/root:/{path}:/workbook`. Set this **or** Workbook item ID, not both.",
    },
  ];
}

/**
 * `workbook-session-id`.
 *
 * Advanced because the header is genuinely optional: without it Graph runs the
 * call sessionless and *does* persist the change. It is the performance knob and
 * the discard-my-changes knob, not the save knob.
 */
export const sessionIdParam: Param = {
  key: "sessionId",
  label: "Workbook session ID",
  type: "string",
  advanced: true,
  hint:
    "The `id` from Create Session, sent as the `workbook-session-id` header. Leave empty to run sessionless — slower, and changes are still saved. A persistent session saves; a non-persistent one discards on expiry.",
};

/** Identifies a worksheet by its id or its display name — Graph accepts either. */
export function worksheetParam(required = true): Param {
  return {
    key: "worksheet",
    label: "Worksheet",
    type: "string",
    required,
    placeholder: "Sheet1",
    hint:
      "Worksheet name or id. Ids look like `{00000000-0001-0000-0000-000000000000}` and are URL-encoded for you. A name survives a rename; an id survives everything.",
  };
}

/** `$select`, `$top`, `$skip` — the Excel collections' paging vocabulary. */
export function collectionParams(opts: { defaultTop?: number; maxTop?: number } = {}): Param[] {
  const defaultTop = opts.defaultTop ?? 50;
  const maxTop = opts.maxTop ?? 1000;
  return [
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$select`. Returns only these properties.",
    },
    {
      key: "top",
      label: "Page size",
      type: "number",
      default: defaultTop,
      validation: { integer: true, min: 1, max: maxTop },
      hint: `OData \`$top\` — results per request, 1 to ${maxTop}.`,
    },
    {
      key: "skip",
      label: "Skip",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint:
        "OData `$skip`. Excel collections have no cursor — Microsoft's own guidance is to page these with `$top` + `$skip`.",
    },
  ];
}

/** `$top`, `$skipToken` continuation and the `@odata.nextLink` walk — Drive search only. */
export function searchPagingParams(): Param[] {
  return [
    {
      key: "top",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1, max: 200 },
      hint: "OData `$top` — results per request.",
    },
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint:
        "The `@odata.nextLink` URL from a previous run. Continues where that run stopped; other query params are ignored because the link already carries them.",
    },
    {
      key: "all",
      label: "Fetch all pages",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Follow `@odata.nextLink` until exhausted or the page cap is reached.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "number",
      default: 10,
      advanced: true,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Upper bound on requests when 'Fetch all pages' is on.",
    },
  ];
}

/** The `range(address='…')` A1-style address. */
export function addressParam(required: boolean, hint?: string): Param {
  return {
    key: "address",
    label: "Range address",
    type: "string",
    required,
    placeholder: "A1:D5",
    hint: hint ??
      "A1-style address, optionally sheet-qualified (`Sheet1!A1:D5`). Leave empty for the worksheet's entire range.",
  };
}

/** The `value`-shaped output every list action returns. */
export const listOutput = [
  { key: "value", type: "array" as const, label: "Items" },
  { key: "nextLink", type: "string" as const, label: "Next link" },
  { key: "pages", type: "number" as const, label: "Pages fetched" },
];
