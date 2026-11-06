import { REQUESTS, SCALARS, SHAPES } from "./schema.ts";

export function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error(`Authorize.Net: ${path} must be a JSON object`);
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Authorize.Net: ${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

/**
 * JSON is translated to XML by Authorize.Net. Visit schema fields, NEVER caller keys, to
 * recreate xs:sequence order at every level (including inherited fields and array items).
 * Unknown fields fail closed: there is no safe position at which to append them.
 * This is an ordering/shape check, not a replacement for all vendor business validation.
 */
export function orderValue(type: string, value: unknown, path = type): unknown {
  const shape = SHAPES[type];
  if (!shape) {
    const scalar = SCALARS[type];
    if (!scalar) throw new Error(`Authorize.Net: unknown schema type ${type}`);
    const valid = scalar.kind === "boolean"
      ? typeof value === "boolean" || value === "true" || value === "false" || value === "0" ||
        value === "1"
      : scalar.kind === "number"
      ? (typeof value === "number" && Number.isSafeInteger(value)) ||
        (typeof value === "string" && /^-?\d+$/.test(value))
      : scalar.kind === "decimal"
      ? (typeof value === "number" && Number.isFinite(value)) ||
        (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value))
      : typeof value === "string";
    if (!valid) throw new Error(`Authorize.Net: ${path} must be ${scalar.kind}`);
    if (scalar.values && !scalar.values.includes(String(value))) {
      throw new Error(`Authorize.Net: invalid ${path}; expected ${scalar.values.join(", ")}`);
    }
    return value;
  }
  const input = asObject(value, path);
  const fields = new Set(shape.fields.map((field) => field.key));
  for (const key of Object.keys(input)) {
    if (!fields.has(key)) throw new Error(`Authorize.Net: unsupported field ${path}.${key}`);
  }
  for (const choice of shape.choices ?? []) {
    if (choice.filter((key) => input[key] !== undefined).length > 1) {
      throw new Error(`Authorize.Net: ${path} accepts only one of ${choice.join(", ")}`);
    }
  }
  const output: Record<string, unknown> = {};
  for (const field of shape.fields) {
    const item = input[field.key];
    // Missing values are omitted, but false, 0 and empty strings are never dropped here.
    if (item === undefined) continue;
    const childPath = `${path}.${field.key}`;
    if (Array.isArray(item)) {
      if (!field.repeat) throw new Error(`Authorize.Net: ${childPath} is not an array field`);
      output[field.key] = item.map((entry, index) =>
        orderValue(field.type, entry, `${childPath}[${index}]`)
      );
    } else {
      output[field.key] = orderValue(field.type, item, childPath);
    }
  }
  return output;
}

export function orderedRequest(name: string, value: unknown): string {
  if (!REQUESTS.includes(name)) throw new Error(`Authorize.Net: unsupported request ${name}`);
  return JSON.stringify({ [name]: orderValue(name, value) });
}
