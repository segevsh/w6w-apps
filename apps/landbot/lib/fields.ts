import { toObject, toStringList } from "./client.ts";

const FIELD_NAME = /^[a-z0-9_]+$/;

/** A custom-field name as a path segment. Landbot only accepts lowercase letters, digits and `_`. */
export function fieldPath(name: string): string {
  const n = String(name ?? "").trim();
  if (!FIELD_NAME.test(n)) {
    throw new Error(
      `Landbot: field name "${n}" is invalid — only lowercase Latin letters, digits and _ are allowed`,
    );
  }
  return n;
}

/** Coerce the text `value` to the declared field type; Landbot takes string, number or boolean. */
export function coerceValue(type: string, value: unknown): string | number | boolean {
  if (type === "integer" || type === "float") {
    const n = Number(value);
    if (value === "" || value === null || !Number.isFinite(n)) {
      throw new Error(`Landbot: "${value}" is not a number (field type ${type})`);
    }
    if (type === "integer" && !Number.isInteger(n)) {
      throw new Error(`Landbot: "${value}" is not an integer`);
    }
    return n;
  }
  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    const s = String(value).trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    throw new Error(`Landbot: "${value}" is not a boolean (use true or false)`);
  }
  return typeof value === "number" || typeof value === "boolean" ? value : String(value);
}

/** The request body for Create / Update Customer Field. */
export function fieldBody(
  input: { type: string; value: unknown; extra?: unknown },
): Record<string, unknown> {
  const extra = toObject(input.extra, "extra");
  return {
    type: input.type,
    value: coerceValue(input.type, input.value),
    ...(extra ? { extra } : {}),
  };
}

/** Template body placeholders: a comma-separated string, an array, or a JSON array string. */
export function bodyParams(v: unknown): string[] {
  if (typeof v === "string" && v.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr.map(String);
    } catch { /* fall through to comma form */ }
  }
  return toStringList(v as string | string[] | undefined);
}
