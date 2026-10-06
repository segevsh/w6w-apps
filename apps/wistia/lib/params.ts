import type { Param } from "@w6w/types";
import type { QueryValue } from "./client.ts";

export const mediaTypeOptions = [
  { value: "Video", label: "Video" },
  { value: "Audio", label: "Audio" },
  { value: "Image", label: "Image" },
  { value: "PdfDocument", label: "PDF document" },
  { value: "MicrosoftOfficeDocument", label: "Microsoft Office document" },
  { value: "Swf", label: "Flash (SWF)" },
  { value: "UnknownType", label: "Unknown" },
];

/** Wistia sends sort direction as an integer: 0 = descending, 1 = ascending (default 1). */
export const sortDirectionParam: Param = {
  key: "sortDirection",
  label: "Sort direction",
  type: "select",
  options: [
    { value: "1", label: "Ascending (Wistia's default)" },
    { value: "0", label: "Descending" },
  ],
};

export function sortByParam(values: Array<[string, string]>, hint?: string): Param {
  return {
    key: "sortBy",
    label: "Sort by",
    type: "select",
    options: values.map(([value, label]) => ({ value, label })),
    hint,
  };
}

/**
 * Offset pagination (`page` + `per_page`) and cursor pagination (`cursor[...]`) are mutually
 * exclusive in Wistia's API. The vendor documents no default and no maximum for `per_page`, so
 * the prefilled value is this app's own choice, not a vendor figure.
 */
export function paginationParams(defaultPerPage: number): Param[] {
  return [
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: defaultPerPage,
      validation: { integer: true, min: 1 },
      hint: "Wistia documents no default or maximum page size; this value is prefilled by w6w.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Offset pagination. Cannot be combined with the cursor fields.",
    },
    {
      key: "cursorAfter",
      label: "Cursor after",
      type: "string",
      hint: "Cursor pagination: pass the previous result's nextCursor to fetch the next page. " +
        "Only sort by id or created while using a cursor.",
    },
    {
      key: "cursorBefore",
      label: "Cursor before",
      type: "string",
      hint: "Cursor pagination: fetch the rows before this cursor.",
    },
  ];
}

export interface ListInput {
  perPage?: number;
  page?: number;
  cursorAfter?: string;
  cursorBefore?: string;
  sortBy?: string;
  sortDirection?: string | number;
}

/** The query fields every Wistia list endpoint shares. */
export function listQuery(input: ListInput): Record<string, QueryValue> {
  return {
    per_page: input.perPage,
    page: input.page,
    "cursor[after]": input.cursorAfter,
    "cursor[before]": input.cursorBefore,
    sort_by: input.sortBy,
    sort_direction: input.sortDirection === undefined || input.sortDirection === ""
      ? undefined
      : String(input.sortDirection),
  };
}

export const pageOutput = [
  { key: "items", type: "array", label: "Rows on this page" },
  { key: "count", type: "number", label: "Rows on this page" },
  { key: "nextCursor", type: "string", label: "Cursor of the last row" },
] as const;

export const mediaIdParam: Param = {
  key: "mediaId",
  label: "Media hashed ID",
  type: "string",
  required: true,
  hint: "The short alphanumeric ID in the media's URL (e.g. abc123xyz9), not the numeric id.",
};

export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder hashed ID",
  type: "string",
  required: true,
  hint: "Folders were called projects before; the hashed ID is the same value.",
};
