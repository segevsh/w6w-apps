import type { Param } from "@w6w/types";

/** A member id (`mem_…`) — the form PATCH, DELETE and the plan routes require. */
export const memberIdParam: Param = {
  key: "memberId",
  label: "Member ID",
  type: "string",
  required: true,
  placeholder: "mem_abc123",
  hint: "The member's id, which starts with mem_.",
};

export const planIdParam: Param = {
  key: "planId",
  label: "Free plan ID",
  type: "string",
  required: true,
  placeholder: "pln_abc123",
  hint: "A FREE plan's id (pln_…). The Admin REST API cannot attach or remove paid plans.",
};

export const tableKeyParam: Param = {
  key: "tableKey",
  label: "Table key or ID",
  type: "string",
  required: true,
  placeholder: "products",
  hint: "The table's key (products) or its id (tbl_…). Tables are created in the Memberstack " +
    "dashboard.",
};

export const recordIdParam: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
};

/**
 * Accept a JSON object either already parsed or as a JSON string (a form field's value
 * arrives as text). Anything else — an array, a scalar, unparseable text — is refused
 * with the field's name, before a request is spent.
 */
export function asObject(value: unknown, label: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error(`${label} must be a JSON object; the text given is not valid JSON`);
    }
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return v as Record<string, unknown>;
}

/** Like {@link asObject} but the field is required. */
export function requireObject(value: unknown, label: string): Record<string, unknown> {
  const out = asObject(value, label);
  if (!out) throw new Error(`${label} is required`);
  return out;
}

/** An object OR an array (Prisma's `orderBy` accepts both), given parsed or as JSON text. */
export function asObjectOrArray(value: unknown, label: string): object | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error(`${label} must be a JSON object or array; the text given is not valid JSON`);
    }
  }
  if (typeof v !== "object" || v === null) {
    throw new Error(`${label} must be a JSON object or array`);
  }
  return v;
}
