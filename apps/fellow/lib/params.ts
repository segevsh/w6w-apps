import type { Param } from "@w6w/types";

/** `X-On-Behalf-Of` — documented for Super Admin keys only. */
export const ON_BEHALF_OF: Param = {
  key: "onBehalfOf",
  label: "Act on behalf of",
  type: "string",
  placeholder: "user@example.com",
  hint: "Super Admin keys only: the email or user id of a workspace member. The request then " +
    "sees only what that user can see. Any other key gets an error when this is set.",
};

export const PAGE_SIZE: Param = {
  key: "pageSize",
  label: "Page size",
  type: "number",
  validation: { min: 1, max: 50, integer: true },
  hint: "1–50 records per page. Fellow's default is 20.",
};

export const CURSOR: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Leave empty for the first page. Pass the `cursor` of the previous result for the next " +
    "one; a null `cursor` in the result means there are no more pages.",
};

const WINDOW_HINT = " Inclusive. YYYY-MM-DD or an ISO datetime; a date without a time means " +
  "midnight UTC, so give an end bound a time (2024-01-05T23:59:59) to cover that whole day.";

export function windowParams(noun: string): Param[] {
  return [
    {
      key: "createdAtStart",
      label: "Created from",
      type: "string",
      hint: `Only ${noun} created at or after this.${WINDOW_HINT}`,
    },
    {
      key: "createdAtEnd",
      label: "Created until",
      type: "string",
      hint: `Only ${noun} created at or before this.${WINDOW_HINT}`,
    },
    {
      key: "updatedAtStart",
      label: "Updated from",
      type: "string",
      hint: `Only ${noun} updated at or after this.${WINDOW_HINT}`,
    },
    {
      key: "updatedAtEnd",
      label: "Updated until",
      type: "string",
      hint: `Only ${noun} updated at or before this.${WINDOW_HINT}`,
    },
  ];
}

export const PAGE_OUTPUT = [
  { key: "items", type: "array" as const, label: "Records on this page" },
  { key: "cursor", type: "string" as const, label: "Cursor for the next page (null at the end)" },
  { key: "pageSize", type: "number" as const, label: "Page size used" },
  { key: "hasMore", type: "boolean" as const, label: "Whether another page exists" },
];
