import type { Param } from "@w6w/types";

export const FILE_FILTER_TYPES = [
  "all",
  "allfiles",
  "documents",
  "spreadsheets",
  "presentations",
  "pdf",
  "audio",
  "video",
  "images",
  "folder",
  "mydrafts",
] as const;

export const resourceId: Param = {
  key: "resourceId",
  label: "File or Folder ID",
  type: "string",
  required: true,
  hint: "The resource_id of the file/folder (the `id` of an item from a listing).",
};

export const teamId: Param = {
  key: "teamId",
  label: "Team ID",
  type: "string",
  required: true,
  hint: "From the Team List action.",
};

export const limit: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  validation: { min: 1, max: 50, integer: true },
  hint: "Items per page (WorkDrive's maximum for listings is 50).",
};

export const offset: Param = {
  key: "offset",
  label: "Offset",
  type: "number",
  validation: { min: 0, integer: true },
  hint: "Where the listing starts (offset pagination).",
};

export const next: Param = {
  key: "next",
  label: "Cursor",
  type: "string",
  hint:
    "Cursor pagination: use 0 for the first request, then the `next` value a previous call returned.",
};

export const filterType: Param = {
  key: "filterType",
  label: "Type Filter",
  type: "select",
  options: FILE_FILTER_TYPES.map((v) => ({ value: v, label: v })),
};

export const pagingParams: Param[] = [limit, offset, next, filterType];

export const listOutput = [
  { key: "items", type: "array", label: "Items (JSON:API resources)" },
  { key: "hasNext", type: "boolean", label: "More pages available (cursor pagination)" },
  { key: "next", type: "string", label: "Next-page cursor URL" },
] as const;
