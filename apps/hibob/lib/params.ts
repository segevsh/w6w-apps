import type { Param } from "@w6w/types";

export const employeeIdParam: Param = {
  key: "employeeId",
  label: "Employee ID",
  type: "string",
  required: true,
  hint: "Bob's internal employee id (the `root.id` field, a long numeric string) — not the " +
    "company's employee number and not an email. Find it with People Search or in the " +
    "employee's URL in Bob.",
};

export const includeArchivedParam: Param = {
  key: "includeArchived",
  label: "Include archived",
  type: "boolean",
  default: false,
  hint: "Include archived columns/items. Bob omits them by default.",
};

export const dateHint = "YYYY-MM-DD";

/**
 * A list param may arrive as an array (JSON param), a JSON-array string, or a
 * comma-separated string. Blank entries are dropped.
 */
export function toStringList(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  let items: unknown[];
  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === "string") {
    const s = value.trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        items = Array.isArray(parsed) ? parsed : [s];
      } catch {
        items = s.split(",");
      }
    } else {
      items = s.split(",");
    }
  } else {
    items = [value];
  }
  return items.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

export function requireString(value: unknown, label: string): string {
  const s = typeof value === "string" ? value.trim() : value === undefined ? "" : String(value);
  if (s.length === 0) throw new Error(`${label} is required`);
  return s;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function requireDate(value: unknown, label: string): string {
  const s = requireString(value, label);
  if (!DATE_RE.test(s)) throw new Error(`${label} must be a date in YYYY-MM-DD form, got "${s}"`);
  return s;
}

/** Accept an object, or a JSON string holding one. */
export function toObject(value: unknown, label: string): Record<string, unknown> {
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error(`${label} must be a JSON object`);
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return v as Record<string, unknown>;
}
