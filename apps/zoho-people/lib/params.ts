import type { Param } from "@w6w/types";

export const formLinkName: Param = {
  key: "formLinkName",
  label: "Form link name",
  type: "string",
  required: true,
  placeholder: "employee",
  hint: "The form's link name, e.g. `employee` or `leave` — list them with the List Forms action.",
};

/** Paging for the bulk-style endpoints; the starting index is 1-based on forms, 0-based on time tracker. */
export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 200,
  hint: "Records per call. Max 200.",
};

export const userParam = (required: boolean, hint: string): Param => ({
  key: "user",
  label: "User",
  type: "string",
  required,
  hint,
});

export const employeeRef: Param = {
  key: "userId",
  label: "Employee",
  type: "string",
  required: true,
  hint: "Employee ID, email address, or the employee's Zoho record id.",
};

export const resultOutput = [
  { key: "result", type: "array" as const, label: "Zoho People result payload" },
  { key: "message", type: "string" as const, label: "Vendor message" },
];
