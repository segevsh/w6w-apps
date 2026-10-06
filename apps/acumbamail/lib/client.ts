import type { HookContext } from "@w6w/types";

/**
 * Thin client for the Acumbamail REST API.
 *
 * Verified on 2026-10-06 against Acumbamail's own API reference
 * (`acumbamail.com/en/apidoc/` plus one page per function,
 * `/en/apidoc/function/{name}/`) and live probes:
 *
 *  - Every function is `https://acumbamail.com/api/1/{function}/`; the reference
 *    recommends POST, with parameters as form-data in the body.
 *  - The credential is an `auth_token` *parameter* (there is no header form).
 *    The Auth `sign` hook merges it into the form body — actions never see it.
 *  - A dictionary parameter is bracket-encoded (`merge_fields[EMAIL]=a@b.c`);
 *    {@link encodeForm} does that. Parameters the reference types as a JSON
 *    list (`subscribers_data`, `messages`) are sent as one JSON string.
 *  - There is no public function index: unknown names 404 on the docs site and
 *    the API answers 401 `Unauthorized` (text/html, 12 bytes) to anything
 *    unsigned, including a bogus token and an unknown function name — so a 401
 *    cannot tell "bad token" from "bad function name".
 *  - Documented statuses: 200, 201, 400 (invalid argument), 401, 429 (too many
 *    requests), 500. Several functions carry per-minute limits (e.g. 10/min).
 */
export const API_BASE = "https://acumbamail.com/api/1";

export class AcumbamailError extends Error {
  constructor(message: string, readonly status: number, readonly vendorMessage: string) {
    super(message);
    this.name = "AcumbamailError";
  }
}

export type FormValue = unknown;

function put(out: URLSearchParams, name: string, value: FormValue): void {
  if (value === undefined || value === null || value === "") return;
  if (typeof value === "boolean") {
    out.append(name, value ? "1" : "0");
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => put(out, `${name}[${i}]`, v));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      put(out, `${name}[${k}]`, v);
    }
  } else {
    out.append(name, String(value));
  }
}

/** Unset values are dropped (never sent as empty), booleans become 1/0, dicts bracket-encode. */
export function encodeForm(fields: Record<string, FormValue>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) put(out, k, v);
  return out;
}

/** A `json` param may arrive parsed or as the text the user typed. */
export function parseJsonField(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

/** Trim a required string/number input; an empty one must fail before it hits the wire. */
export function required(name: string, value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) throw new Error(`${name} is required`);
  return s;
}

export function fnUrl(fn: string): string {
  if (!/^[A-Za-z]+$/.test(fn)) throw new Error(`invalid function name: ${fn}`);
  return `${API_BASE}/${fn}/`;
}

export function parseBody(text: string): unknown {
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

/** POST one function; returns the parsed body (`null` when empty, the raw text when not JSON). */
export async function call(
  ctx: HookContext,
  fn: string,
  fields: Record<string, FormValue> = {},
): Promise<unknown> {
  const res = await ctx.fetch(fnUrl(fn), {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: encodeForm(fields).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    const vendor = text.trim().slice(0, 200);
    throw new AcumbamailError(
      `Acumbamail ${fn} failed (${res.status})${vendor ? `: ${vendor}` : ""}`,
      res.status,
      vendor,
    );
  }
  return parseBody(text);
}
