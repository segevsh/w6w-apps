import type { HookContext } from "@w6w/types";

/**
 * Loops' v1 REST API — verified against the OpenAPI 3.1 document Loops serves
 * from its own app host (`https://app.loops.so/openapi.json`, "Loops OpenAPI
 * Spec" v1.21.7, 385KB, fetched 2026-08-18), whose `servers` block states
 * `https://app.loops.so/api`.
 *
 * Note where the version lives: the base is `/api` and every path carries
 * `/v1/…` itself, so the two together give `https://app.loops.so/api/v1/…`.
 */
export const API_URL = "https://app.loops.so/api/v1";

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Extra request headers. Only ever used for `Idempotency-Key`. */
  headers?: Record<string, string>;
}

/** Drop keys the caller left unset so an update does not clear untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Loops identifies a contact by **either** `email` or `userId`, and several
 * endpoints require exactly one of the two. Naming neither is the mistake worth
 * catching locally: the API answers a generic 400 that does not say which field
 * was missing, and on `contacts/update` naming neither silently means "create a
 * new contact" instead of "update the one I meant".
 */
export function contactIdentity(
  email: unknown,
  userId: unknown,
  where: string,
): { email?: string; userId?: string } {
  const e = String(email ?? "").trim();
  const u = String(userId ?? "").trim();
  if (!e && !u) {
    throw new Error(`${where} needs a contact — set \`email\` or \`userId\``);
  }
  return compact({ email: e, userId: u }) as { email?: string; userId?: string };
}

/**
 * Custom contact properties.
 *
 * Loops' `ContactFields` schema declares `additionalProperties` of string,
 * number or boolean — every custom property a workspace defines lives at the
 * **top level of the contact object**, beside `firstName` and `userGroup`,
 * rather than under a `properties` key. So a custom-property object is merged
 * in rather than nested, and the reserved names are guarded: a custom property
 * called `email` would otherwise overwrite the identity the call is keyed on.
 */
const RESERVED = new Set([
  "email",
  "userId",
  "firstName",
  "lastName",
  "source",
  "subscribed",
  "userGroup",
  "mailingLists",
]);

export function mergeCustomProperties(
  body: Record<string, unknown>,
  raw: unknown,
): Record<string, unknown> {
  const custom = json(raw, "customProperties");
  if (custom === undefined) return body;
  if (typeof custom !== "object" || custom === null || Array.isArray(custom)) {
    throw new Error("`customProperties` must be a JSON object of name → value");
  }
  for (const [key, value] of Object.entries(custom as Record<string, unknown>)) {
    if (RESERVED.has(key)) {
      throw new Error(
        `\`customProperties\` may not contain "${key}" — it is a built-in contact field, and ` +
          "setting it here would overwrite the one this action is keyed on",
      );
    }
    const kind = typeof value;
    if (value !== null && kind !== "string" && kind !== "number" && kind !== "boolean") {
      throw new Error(
        `custom property "${key}" is a ${kind} — Loops accepts only strings, numbers and booleans`,
      );
    }
    body[key] = value;
  }
  return body;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class LoopsClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.headers ?? {}),
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // Loops' envelope is `{"success": false, "message": "...", "error": ...}`.
      // The message is the useful half ("Invalid API key"), and the whole body
      // is surfaced because `error` sometimes carries per-field detail.
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Loops ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /**
   * Follow Loops' cursor pagination, collecting the `data` array.
   *
   * The list endpoints answer `{pagination: {…, nextCursor}, data: [...]}`,
   * where `nextCursor` is **null** on the last page rather than absent — so the
   * loop tests for a truthy cursor, not for the key existing. `perPage` is
   * capped at 50 by Loops.
   *
   * `GET /v1/lists` is the exception: it answers a bare array with no
   * pagination at all, which `request` handles directly.
   */
  async requestAll<T = unknown>(
    path: string,
    options: RequestOptions = {},
    wantTotal = Infinity,
  ): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | undefined;
    while (items.length < wantTotal) {
      const perPage = Math.min(50, Math.max(1, wantTotal - items.length));
      const page = await this.request<{
        data?: T[];
        pagination?: { nextCursor?: string | null };
      }>(path, { ...options, query: { ...options.query, perPage, cursor } });
      const chunk = page?.data ?? [];
      items.push(...chunk);
      cursor = page?.pagination?.nextCursor ?? undefined;
      if (!cursor || chunk.length === 0) break;
    }
    return Number.isFinite(wantTotal) ? items.slice(0, wantTotal) : items;
  }
}

/**
 * Mailing-list subscriptions.
 *
 * Loops takes these as an **object of list id → boolean**, where `true` adds
 * the contact to the list and `false` removes them — not as an array of ids.
 * The distinction matters: an array is silently ignored rather than rejected,
 * so a workflow that "subscribes" someone with a list would appear to work and
 * change nothing.
 *
 * A JSON object is passed through as given, so removals are expressible. A
 * comma-separated string is the common case — subscribe to these — and is
 * expanded to all-`true`.
 */
export function mailingListSubscriptions(value: unknown): Record<string, boolean> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  // A comma-separated list of ids is not JSON, so parsing is attempted rather
  // than required: `"l1, l2"` is the common case and must not be an error.
  let parsed: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) parsed = json(trimmed, "mailingLists");
  }
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const out: Record<string, boolean> = {};
    for (const [id, on] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof on !== "boolean") {
        throw new Error(
          `mailing list "${id}" must map to true (add) or false (remove), not ${typeof on}`,
        );
      }
      out[id] = on;
    }
    return Object.keys(out).length ? out : undefined;
  }
  // A plain list of ids means "add to all of these".
  const ids = csv(parsed);
  return ids ? Object.fromEntries(ids.map((id) => [id, true])) : undefined;
}

/**
 * Loops' idempotency key, derived from the step that is calling.
 *
 * The two sending endpoints — `POST /v1/transactional` and
 * `POST /v1/events/send` — accept an `Idempotency-Key` header, described by
 * the spec as *"a unique ID for this request (maximum 100 characters) to avoid
 * duplicate emails"*. Reusing a key with a **different** body is refused with a
 * `409`, which is the behaviour that makes it safe rather than merely
 * convenient: a retry of the same step cannot quietly become a second, subtly
 * different email.
 *
 * The invocation id is the natural key — it is stable across a retry of the
 * same step and different for the next one — so the sending actions offer it
 * as an opt-in rather than making the caller invent one. It is truncated to
 * the documented 100 characters.
 */
export function idempotencyHeader(
  ctx: HookContext,
  enabled: unknown,
): Record<string, string> | undefined {
  if (enabled !== true) return undefined;
  const invocation = ctx.invocation?.invocationId;
  if (!invocation) return undefined;
  return { "Idempotency-Key": `w6w-${invocation}`.slice(0, 100) };
}
