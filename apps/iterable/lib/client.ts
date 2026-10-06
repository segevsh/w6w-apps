import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Iterable's REST API. Verified 2026-10-06 against the vendor's Swagger 2.0
 * document (`https://api.iterable.com/api-docs`, v1.8, `host: api.iterable.com`,
 * every path under `/api/`, `securityDefinitions.api_key` = header `Api-Key`).
 *
 * Iterable is split into two entirely separate data centers — US
 * (`api.iterable.com`) and EU (`api.eu.iterable.com`). A project lives in one;
 * a key minted in one is not valid in the other (the wrong host answers
 * `401 {"code":"Unauthorized","msg":"Invalid API key"}`, measured live
 * 2026-10-06 with a fake key on both hosts). The region is therefore collected
 * once, on the Connection, and echoed onto its redacted `display` by
 * `afterConnect` so actions can pick a host without ever seeing the credential.
 */
export type Region = "us" | "eu";

export const HOSTS: Record<Region, string> = {
  us: "api.iterable.com",
  eu: "api.eu.iterable.com",
};

export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return display.region === "eu" ? "eu" : "us";
}

export function apiBase(region: Region): string {
  return `https://${HOSTS[region]}/api`;
}

// ---------------------------------------------------------------------------
// Parameter readers
// ---------------------------------------------------------------------------

/** Trimmed non-empty string, else `undefined`. Numbers are stringified. */
export function str(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

export function int(name: string, v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isInteger(n)) throw new Error(`\`${name}\` must be an integer`);
  return n;
}

export function num(name: string, v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) throw new Error(`\`${name}\` must be a number`);
  return n;
}

export function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

/** A `json` param arrives parsed in the reference runtime but as a raw string on some hosts. */
export function jsonValue(name: string, v: unknown): unknown {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t);
  } catch {
    throw new Error(`\`${name}\` is not valid JSON`);
  }
}

export function jsonObject(name: string, v: unknown): Record<string, unknown> | undefined {
  const parsed = jsonValue(name, v);
  if (parsed === undefined) return undefined;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`\`${name}\` must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

export function jsonArray(name: string, v: unknown): unknown[] | undefined {
  const parsed = jsonValue(name, v);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed)) throw new Error(`\`${name}\` must be a JSON array`);
  return parsed;
}

/** A list of integers from an array, or a comma/space separated string. */
export function intList(name: string, v: unknown): number[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const parts = Array.isArray(v) ? v : String(v).split(/[,\s]+/).filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((p) => {
    const n = typeof p === "number" ? p : Number(String(p).trim());
    if (!Number.isInteger(n)) throw new Error(`\`${name}\` must be a list of integers`);
    return n;
  });
}

/** A list of strings from an array, or a comma separated string. */
export function strList(v: unknown): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const parts = Array.isArray(v) ? v.map(String) : String(v).split(",");
  const out = parts.map((p) => p.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export type Query = Record<string, string | number | boolean | Array<string | number> | undefined>;

export interface CallOptions {
  query?: Query;
  body?: unknown;
  /** The endpoint answers `text/plain` (CSV or newline lists) — return it as `{ text }`. */
  text?: boolean;
}

function queryString(query: Query | undefined): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    // Swagger `collectionFormat: multi` — the key repeats once per value.
    if (Array.isArray(v)) { for (const item of v) sp.append(k, String(item)); }
    else sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Iterable error bodies are `{ msg, code, params }` where `code` is an enum
 * (`Unauthorized`, `BadParams`, `NotFound`, `RateLimitExceeded`, …). `Success`
 * is the only non-error value. The status code is a hint, not the verdict:
 * a 2xx whose body carries a code other than `Success` is still a failure.
 */
export interface IterableEnvelope {
  code?: string;
  msg?: string;
  params?: unknown;
}

function describe(body: unknown, raw: string): string {
  if (body && typeof body === "object") {
    const b = body as IterableEnvelope;
    if (b.msg || b.code) return `${b.code ?? "error"}: ${b.msg ?? ""}`.trim();
  }
  return raw.slice(0, 300);
}

/**
 * One Iterable call. `path` begins with `/` and is relative to `/api`.
 * Never sets credentials — `sign` stamps the `Api-Key` header.
 */
export async function call(
  ctx: HookContext,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  opts: CallOptions = {},
): Promise<Record<string, unknown>> {
  const region = regionFromConnection(ctx.connection);
  const init: RequestInit = { method, headers: { accept: "application/json, text/plain" } };
  if (opts.body !== undefined) {
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(opts.body);
  }
  const res = await ctx.fetch(`${apiBase(region)}${path}${queryString(opts.query)}`, init);
  const raw = await res.text().catch(() => "");
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    parsed = undefined;
  }
  if (!res.ok) {
    throw new Error(`Iterable ${res.status} for ${method} ${path}: ${describe(parsed, raw)}`);
  }
  if (opts.text) {
    // A text endpoint that fails with a 200 + JSON error envelope is still an error.
    const env = parsed as IterableEnvelope | undefined;
    if (env && typeof env === "object" && env.code && env.code !== "Success") {
      throw new Error(`Iterable error for ${method} ${path}: ${describe(parsed, raw)}`);
    }
    return { text: raw };
  }
  if (parsed === undefined) return { code: "Success" };
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { data: parsed };
  }
  const env = parsed as IterableEnvelope;
  if (env.code && env.code !== "Success") {
    throw new Error(`Iterable error for ${method} ${path}: ${describe(parsed, raw)}`);
  }
  return parsed as Record<string, unknown>;
}

/** Remove keys whose value is `undefined`. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/** Throw unless exactly the right number of the named inputs is present. */
export function oneOf(
  names: string[],
  values: Record<string, unknown>,
  mode: "exactly-one" | "at-least-one" = "exactly-one",
): void {
  const present = names.filter((n) => values[n] !== undefined);
  if (present.length === 0) {
    throw new Error(`one of ${names.map((n) => `\`${n}\``).join(", ")} is required`);
  }
  if (mode === "exactly-one" && present.length > 1) {
    throw new Error(`provide only one of ${names.map((n) => `\`${n}\``).join(", ")}`);
  }
}
