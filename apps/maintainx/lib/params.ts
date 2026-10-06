import type { Param } from "@w6w/types";

export const organizationIdParam: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "number",
  hint: "Only for an API key that spans several organizations (sent as x-organization-id). " +
    "Leave empty for a single-organization key.",
};

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "The nextCursor from the previous page; empty for the first page.",
};

export function limitParam(defaultValue = 50): Param {
  return {
    key: "limit",
    label: "Limit",
    type: "number",
    default: defaultValue,
    validation: { min: 1, max: 200, integer: true },
    hint: `1-200. MaintainX's own default is 100; ${defaultValue} is prefilled here.`,
  };
}

export function idParam(key: string, label: string): Param {
  return { key, label, type: "number", required: true, validation: { integer: true } };
}

export const paginationParams: Param[] = [limitParam(), cursorParam];

export function expandParam(values: string[]): Param {
  return {
    key: "expand",
    label: "Expand",
    type: "string",
    hint: "Comma-separated extra data to inline. Allowed: " + values.join(", ") + ".",
  };
}

export const PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;

export const prioritySelect = (required = false): Param => ({
  key: "priority",
  label: "Priority",
  type: "select",
  required,
  options: PRIORITIES.map((p) => ({ value: p, label: p[0] + p.slice(1).toLowerCase() })),
});
