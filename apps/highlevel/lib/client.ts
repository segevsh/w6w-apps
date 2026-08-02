/**
 * Shared HTTP client for HighLevel's public API v2 (`services.leadconnectorhq.com`).
 *
 * Two things every request needs that a generic REST wrapper wouldn't guess:
 *
 *   - A `Version` header naming a dated API revision. Most resources pin
 *     `2021-07-28`; Calendars and Conversations were versioned separately and
 *     still pin the older `2021-04-15` — passing the wrong one 400s, so callers
 *     that touch those two resource groups pass `version: CALENDAR_API_VERSION`
 *     explicitly (see each action).
 *   - A `locationId` identifying which HighLevel sub-account ("location") to
 *     act on — HighLevel is multi-tenant per Connection the same way a
 *     QuickBooks `realmId` or HubSpot portal is, except the id has to be
 *     threaded onto every request (query string on reads, JSON body on
 *     writes) rather than a single header. It comes from the OAuth token
 *     response (`locationId` is a top-level field HighLevel returns alongside
 *     `access_token` for a Location-level install) and is carried on the
 *     connection's redacted `display` — see `auth/oauth2.ts`.
 */
import type { HookContext, RedactedConnection } from "@w6w/types";

export const API_URL = "https://services.leadconnectorhq.com";

/** `Version` header for every resource except Calendars and Conversations. */
export const API_VERSION = "2021-07-28";
/** `Version` header for the Calendars and Conversations resource groups. */
export const CALENDAR_API_VERSION = "2021-04-15";

/**
 * The location (sub-account) this Connection is scoped to. Recorded by
 * `afterConnect` from the OAuth token response — see `auth/oauth2.ts`.
 */
export function locationIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { locationId?: string };
  if (display.locationId) return display.locationId;
  throw new Error(
    "HighLevel connection has no locationId — reconnect the app to a specific location.",
  );
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  body?: unknown;
  /** `Version` header for this request. Defaults to `API_VERSION`. */
  version?: string;
}

interface HighLevelErrorBody {
  message?: string | string[];
  error?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime
 * routes every request through the auth `sign` hook, which injects it.
 */
export class HighLevelClient {
  constructor(private ctx: HookContext) {}

  /** The sub-account this Connection is scoped to. */
  get locationId(): string {
    return locationIdFromConnection(this.ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${API_URL}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v)) {
          for (const entry of v) url.searchParams.append(k, String(entry));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      version: options.version ?? API_VERSION,
      accept: "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const body = JSON.parse(text) as HighLevelErrorBody;
        detail = Array.isArray(body.message)
          ? body.message.join("; ")
          : body.message ?? body.error ?? text;
      } catch { /* keep the raw body */ }
      throw new Error(
        `HighLevel ${res.status} for ${init.method ?? "GET"} ${url.pathname}: ${detail}`,
      );
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Drop keys the caller left unset so a PUT doesn't null out untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Accept a `"a,b,c"` string or a `["a","b"]` array; return array or undefined. */
export function normalizeCsv(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v.length ? v : undefined;
  const s = v.trim();
  return s ? s.split(",").map((x) => x.trim()).filter(Boolean) : undefined;
}

/**
 * Parse a JSON-object form field (e.g. "Additional fields") into a plain
 * object. Rejects anything that isn't an object so a typo fails here rather
 * than as an opaque 400 from HighLevel.
 */
export function jsonObject(raw: unknown, paramName: string): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`\`${paramName}\` must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}
