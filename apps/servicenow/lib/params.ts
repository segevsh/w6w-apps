import type { Param } from "@w6w/types";

/** ServiceNow's Table API takes `sysparm_limit` / `sysparm_offset`, not cursors. */
export const pagination: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    row: "page",
    validation: { min: 1, max: 500, integer: true },
    hint:
      "Table API default is 10,000 — this app caps the field at 500 to keep a single call cheap.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    default: 0,
    row: "page",
    advanced: true,
    validation: { min: 0, integer: true },
    hint: "Row offset for the next page (`sysparm_offset`). There is no cursor.",
  },
];

/** Shared "which fields, which shape" options every read/list action exposes. */
export const readOptions: Param[] = [
  {
    key: "fields",
    label: "Fields",
    type: "string",
    advanced: true,
    hint: "Comma-separated column names to return (`sysparm_fields`). Leave blank for all fields.",
  },
  {
    key: "displayValue",
    label: "Return values",
    type: "select",
    default: "false",
    advanced: true,
    options: [
      { value: "false", label: "Actual values" },
      { value: "true", label: "Display values" },
      { value: "all", label: "Both" },
    ],
    hint:
      "`sysparm_display_value` — whether reference/choice fields come back as raw values or labels.",
  },
];

export const queryParam: Param = {
  key: "query",
  label: "Filter query",
  type: "string",
  placeholder: "active=true^priority=1",
  hint:
    "Encoded query (`sysparm_query`) — the same syntax as GlideRecord.addEncodedQuery(), e.g. `active=true^priority=1`.",
};

export const impactUrgencyOptions = [
  { value: "1", label: "High" },
  { value: "2", label: "Medium" },
  { value: "3", label: "Low" },
];

export const contactTypeOptions = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "self-service", label: "Self-service" },
  { value: "walk-in", label: "Walk-in" },
];

export const incidentResultOutput = [
  { key: "result.sys_id", type: "string" as const, label: "Sys ID" },
  { key: "result.number", type: "string" as const, label: "Number" },
  { key: "result.short_description", type: "string" as const, label: "Short description" },
  { key: "result.state", type: "string" as const, label: "State" },
];
