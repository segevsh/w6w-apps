import type { HookContext } from "@w6w/types";

/**
 * The Lever Data API (v1) — built against Lever's own developer documentation
 * and probed live on 2026-08-19.
 *
 * ## A plain list of opportunities is missing rows, and says nothing
 *
 * This is the one to know. Lever's documentation: the `confidentiality`
 * parameter, "**if unspecified, defaults to non-confidential**. To get both
 * confidential and non-confidential opportunities you must specify `all`."
 *
 * So `GET /opportunities` silently applies a filter nobody asked for. A
 * workflow counting candidates, exporting a pipeline or reconciling against
 * another system gets a number that is quietly wrong, with a 200 and no
 * indication.
 *
 * And it compounds: an API key can only *see* confidential data if that was
 * granted **when the key was created**, and Lever does not allow adding it
 * later. So there are two independent ways to be missing records, neither
 * visible in a response. Every action here that lists opportunities takes an
 * explicit `confidentiality` and reports which one it used.
 *
 * ## A person is a contact; an application is an opportunity
 *
 * The `/candidates` endpoints were deprecated in 2020. What replaced them
 * distinguishes the **contact** — the human, with their email and phone — from
 * the **opportunity**, which is one application to one posting. A person who
 * applies three times is one contact and three opportunities.
 *
 * Deduplicating a hiring pipeline by opportunity id therefore counts people
 * several times, and `contact.id` is the key that does not.
 *
 * ## Creating an opportunity for a known email never creates a person
 *
 * Lever's words: "If an email address is provided, we will always attempt to
 * dedupe the candidate. If a match is found, we will create a new Opportunity
 * that is linked to the existing matching candidate's contact (i.e. we never
 * create a new contact, or person, if a match has been found). The existing
 * candidate's contact data will take precedence over new manually provided
 * information."
 *
 * That last sentence is the sharp one: a create carrying a corrected phone
 * number against an existing contact **keeps the old number** and reports
 * success.
 *
 * ## `offset` is a token, not a number
 *
 * Despite the name. Lever returns `next` on every paginated response and says:
 * "You can only pass in an offset that was returned to you via a previously
 * paginated request." Computing `offset = page * limit` is not a smaller page,
 * it is a different API.
 *
 * ## `include` is exclusive, which is the opposite of what it sounds like
 *
 * "If the `include` parameter is specified, no other fields other than those
 * set in the request will be returned." So asking to *include* one field
 * removes every other one. `expand` is the additive parameter — it inlines a
 * referenced object in place of its id.
 */

export const API = "https://api.lever.co/v1";
export const SANDBOX_API = "https://api.sandbox.lever.co/v1";

/** What `confidentiality` may be, and what each means. */
export const CONFIDENTIALITY = {
  nonConfidential: "non-confidential",
  confidential: "confidential",
  all: "all",
} as const;

export type QueryValue = string | number | boolean | undefined | null;

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}

/** Drop keys the caller left unset. */
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

/** Which host a connection speaks to — production unless it is a sandbox. */
export function hostFromConnection(connection: unknown): string {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  return display?.environment === "sandbox" ? SANDBOX_API : API;
}

/** Which data centre a connection's account lives in, for the health check. */
export function dataCenterFromConnection(connection: unknown): "global" | "eu" {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  return display?.dataCenter === "eu" ? "eu" : "global";
}

/**
 * Validate a Lever id.
 *
 * Every id in this API is a UUID. Lever answers a malformed one with a 404
 * whose message names the resource — "stages a80bbbe0-… was not found" — which
 * reads as a missing record rather than a malformed request.
 */
export function assertUuid(value: unknown, field: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(
      `\`${field}\` must be a UUID — got ${JSON.stringify(id.slice(0, 40))}. Lever answers a ` +
        "malformed id with a 404 that names the resource, which reads as a missing record " +
        "rather than a bad request",
    );
  }
  return id.toLowerCase();
}

/**
 * The `perform_as` a write must carry.
 *
 * Lever attributes every write to a user: "All query parameters except the
 * `perform_as` parameter are optional" on create, and it is accepted on every
 * other write. Without it a workflow's notes and stage changes have no author,
 * and on create Lever refuses outright.
 *
 * The id is a Lever **user** id, which `user-list` reports.
 */
export function assertPerformAs(value: unknown): string {
  const id = String(value ?? "").trim();
  if (!id) {
    throw new Error(
      "`performAs` is required — Lever attributes every write to a user, and refuses a create " +
        "without one. It is a Lever user's UUID, which `user-list` reports; pick the account " +
        "the automation should appear to act as",
    );
  }
  return assertUuid(id, "performAs");
}

/** Turn a Lever error into something actionable. */
export function describeError(status: number, text: string): string {
  let code = "";
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { code?: string; message?: string };
    code = String(body?.code ?? "");
    detail = body?.message ?? detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — Lever takes the API key as the BASIC AUTH USERNAME ` +
      "with an empty password, not as a bearer token, and answers the same 401 either way";
  }
  if (status === 403) {
    return `${detail || "forbidden"} — the key authenticated and the account's settings do not ` +
      "allow this. Note that access to CONFIDENTIAL data is granted only when a key is created " +
      "and cannot be added afterwards, so a key that reads most opportunities can be refused one";
  }
  if (status === 404) {
    return `${detail || "not found"} — Lever also answers 404 for a malformed id, naming the ` +
      "resource as though the record were missing. And an opportunity that is confidential is " +
      "absent rather than forbidden for a key without that access";
  }
  if (status === 429) {
    return `${detail || "rate limited"} — Lever limits requests in a short window. There is no ` +
      "header reporting the budget, so the only strategy is exponential backoff";
  }
  return code ? `${detail} [${code}]` : detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** A paginated list, with Lever's opaque cursor. */
export interface Page<T> {
  data: T[];
  next?: string;
  hasNext: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the key — the runtime routes
 * every request through the auth `sign` hook.
 */
export class LeverClient {
  private host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  /** A single resource, unwrapped from `{ data: … }`. */
  async one<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const body = await this.request<{ data?: T }>(path, options);
    return body?.data as T;
  }

  /** A list, with the cursor Lever calls an offset. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<Page<T>> {
    const body = await this.request<{ data?: T[]; next?: string; hasNext?: boolean }>(
      path,
      options,
    );
    return {
      data: body?.data ?? [],
      next: body?.next,
      hasNext: body?.hasNext === true,
    };
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `Lever ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }

    if (res.status === 204 || !text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Lever did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * Whether a contact has been anonymized.
 *
 * Lever anonymizes contacts for data-protection requests: the personal fields
 * are removed and the record stays for reporting. A workflow reading a name or
 * an email off one gets nothing, which looks like a broken record rather than
 * a deliberate erasure.
 */
export function isAnonymized(contact: unknown): boolean {
  return (contact as { isAnonymized?: boolean } | undefined)?.isAnonymized === true;
}
