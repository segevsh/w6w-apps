import type { OutputField, Param } from "@w6w/types";

export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  required: true,
  hint: "The Leadfeeder account id (`account_id`); ids come from List Accounts.",
};

export const pageNumParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "Page number (`page[num]`), starting at 1.",
  validation: { min: 1, integer: true },
};

export const pageSizeParam: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  hint: "Results per page (`page[size]`), at most 100.",
  validation: { min: 1, max: 100, integer: true },
};

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "`nextCursor` from the previous page (`page[cursor]`); omit for the first page.",
};

export const dataOutput: OutputField = { key: "data", type: "object", label: "Response `data`" };
export const metaOutput: OutputField = {
  key: "meta",
  type: "object",
  label: "Response `meta` (request id, pagination, credits charged)",
};
export const nextPageOutput: OutputField = {
  key: "nextPage",
  type: "number",
  label: "Next page number, when more pages exist",
};
export const nextCursorOutput: OutputField = {
  key: "nextCursor",
  type: "string",
  label: "Cursor for the next page, when more results exist",
};
