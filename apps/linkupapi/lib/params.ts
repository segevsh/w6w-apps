/**
 * Input-to-wire mapping shared by every action. Inputs are camelCase; the API wants
 * snake_case (and, for the recruiter sort fields, its own camelCase), so each action
 * declares `[inputKey, apiKey, kind]` triples and this turns an input into a `params` object.
 *
 * kind: `s` string, `n` number, `b` boolean, `m` multi-value (split on `;`, or an array).
 */
export type Kind = "s" | "n" | "b" | "m";
export type Field = readonly [input: string, api: string, kind: Kind];

/** Split a `;`-separated string into trimmed non-empty values; a single value stays a string. */
export function multi(v: unknown): string | string[] | undefined {
  const items = Array.isArray(v) ? v.map(String) : String(v ?? "").split(";");
  const out = items.map((s) => s.trim()).filter(Boolean);
  if (out.length === 0) return undefined;
  return out.length === 1 ? out[0] : out;
}

function num(v: unknown, label: string): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${label} must be a number`);
  return n;
}

export function mapInput(
  input: object,
  fields: readonly Field[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, api, kind] of fields) {
    const raw = (input as Record<string, unknown>)[key];
    if (raw === undefined || raw === null || raw === "") continue;
    let value: unknown;
    if (kind === "n") value = num(raw, key);
    else if (kind === "b") value = raw === true || raw === "true";
    else if (kind === "m") value = multi(raw);
    else value = typeof raw === "string" ? raw.trim() : raw;
    if (value !== undefined && value !== "") out[api] = value;
  }
  return out;
}
