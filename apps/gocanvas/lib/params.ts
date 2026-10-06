import type { Param } from "@w6w/types";

export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  validation: { min: 1, integer: true },
  hint: "1-based page number. GoCanvas pages of 100 by default; the response's " +
    "`pagination.nextPage` is the next page to ask for, null on the last.",
};

export const hardDeleteParam: Param = {
  key: "hardDelete",
  label: "Delete permanently",
  type: "boolean",
  default: false,
  hint: "Off (default): soft delete - the record is hidden from the web views but kept. " +
    "On: permanent, cannot be undone.",
};

export function idParam(key: string, label: string): Param {
  return { key, label, type: "number", required: true, validation: { integer: true } };
}

export function optionalIdParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "number", validation: { integer: true }, ...(hint ? { hint } : {}) };
}

export const departmentIdParam: Param = optionalIdParam(
  "departmentId",
  "Department ID",
  "Required when Departments are enabled for the company; otherwise the user's default " +
    "department is used.",
);

export const DEPARTMENT_ROLES = [
  "department_admin",
  "department_reporter",
  "department_user",
  "department_designer",
  "department_dispatcher",
] as const;

export const WEBHOOK_EVENTS = [
  "submission_create",
  "submission_edit",
  "dispatch_create",
  "workflow_handoff_create",
  "submission_custom_status_change",
] as const;

export function optionsOf(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export function roleParam(required: boolean): Param {
  return {
    key: "departmentRole",
    label: "Department role",
    type: "select",
    required,
    options: optionsOf(DEPARTMENT_ROLES),
  };
}

export function eventParam(required: boolean): Param {
  return {
    key: "eventType",
    label: "Event type",
    type: "select",
    required,
    options: optionsOf(WEBHOOK_EVENTS),
    hint: "submission_create fires when a submission is completed; workflow_handoff_create " +
      "fires when a handoff is created.",
  };
}
