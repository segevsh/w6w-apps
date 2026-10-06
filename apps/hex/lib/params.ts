import type { Param } from "@w6w/types";

export const projectIdParam: Param = {
  key: "projectId",
  label: "Project ID",
  type: "string",
  required: true,
  hint: "UUID of the Hex project: the Variables sidebar of its Logic view, or the project URL.",
};

export const runIdParam: Param = {
  key: "runId",
  label: "Run ID",
  type: "string",
  required: true,
  hint: "The `runId` returned by Run Project or List Project Runs.",
};

export const runStatusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "RUNNING", label: "Running" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ERRORED", label: "Errored" },
  { value: "KILLED", label: "Killed" },
  { value: "UNABLE_TO_ALLOCATE_KERNEL", label: "Unable to allocate kernel" },
];

/** Cursor pagination, as used by every list endpoint except project runs. */
export function cursorParams(max: number, defaultLimit = 25): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max },
      hint: `Page size, 1-${max}.`,
    },
    {
      key: "after",
      label: "After cursor",
      type: "string",
      hint: "Pass the previous page's `pagination.after` to fetch the next page.",
    },
  ];
}

export interface CursorInput {
  limit?: number;
  after?: string;
}

export const CURSOR_OUTPUT = [
  { key: "values", type: "array", label: "Results" },
  { key: "pagination", type: "object", label: "`after` / `before` cursors (null at the ends)" },
] as const;
