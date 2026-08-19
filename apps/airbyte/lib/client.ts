import type { HookContext } from "@w6w/types";

/**
 * Airbyte's public API (v1) — built against the vendor's own OpenAPI
 * definitions and probed live on 2026-08-19.
 *
 * ## Access tokens live for three minutes
 *
 * Airbyte's documentation, verbatim: "Access tokens are short-lived, and are
 * only valid for 3 minutes. We recommend fetching a new token before each
 * request."
 *
 * That is the shortest credential lifetime in this pack by two orders of
 * magnitude, and it changes how the connection has to work: the stored
 * credential is the **application** — a client id and secret — and the token
 * is minted per run rather than cached. Anything that holds a token for the
 * length of a normal workflow is holding an expired one.
 *
 * Self-Managed Enterprise gets 24 hours; Cloud and open source get three
 * minutes.
 *
 * ## Self-hosted Airbyte can be wide open
 *
 * Airbyte's own note: with authentication turned off, "the Airbyte API is
 * accessible without any authentication". So a self-hosted deployment reachable
 * from anywhere may take instructions from anyone — worth knowing about a
 * product whose job is holding every database credential a company has.
 *
 * ## A sync can end `incomplete`, which is neither success nor failure
 *
 * The job status enum is `pending`, `running`, `incomplete`, `failed`,
 * `succeeded`, `cancelled`. **`incomplete`** is the one that catches people: a
 * sync where some streams landed and others did not. A workflow branching on
 * `status === "failed"` treats it as success and moves data that is missing
 * half its rows. `isJobHealthy` and every job action here name it explicitly.
 *
 * ## `reset` is a destructive job type wearing the same endpoint as `sync`
 *
 * `POST /jobs` takes `jobType: "sync" | "reset"`. A reset **deletes the
 * connection's data in the destination** and starts again. One word apart, in
 * the same call.
 *
 * ## Filtering a job list by two things silently uses one
 *
 * Airbyte documents it: "If you try to filter by both `connectionId` and
 * `workspaceIds`, the only thing filtered-by will be `connectionId`." Not an
 * error — a silent precedence, which is the kind of thing that makes a report
 * quietly wrong.
 */

export const CLOUD_HOST = "https://api.airbyte.com";

/** Job states that mean the data did not all arrive. */
export const UNHEALTHY_JOB_STATUSES = ["failed", "incomplete", "cancelled"];

/** Whether a finished job actually delivered everything. */
export function isJobHealthy(status: unknown): boolean {
  return String(status ?? "") === "succeeded";
}

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

/** Normalise a host: add a scheme, drop a trailing slash and any API path. */
export function normalizeHost(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\/+$/, "").replace(/\/(api\/public\/)?v1.*$/, "");
  if (!raw) return CLOUD_HOST;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    throw new Error(`\`${raw}\` is not a usable host`);
  }
}

/** Which host a connection speaks to — Airbyte Cloud unless told otherwise. */
export function hostFromConnection(connection: unknown): string {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  return String(display?.host ?? "").trim() || CLOUD_HOST;
}

/**
 * Validate a UUID.
 *
 * Every id in this API is one — connections, sources, destinations,
 * workspaces, jobs. Airbyte answers a malformed id with a 400 whose body is
 * sometimes only an `errorId`, so catching the shape here is the difference
 * between "that is not a UUID" and an opaque failure.
 */
export function assertUuid(value: unknown, field: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${field}\` is required`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(
      `\`${field}\` must be a UUID — got ${JSON.stringify(id.slice(0, 40))}. Every Airbyte id is ` +
        "a UUID, and it is visible in the address bar of the Airbyte UI",
    );
  }
  return id.toLowerCase();
}

/** Turn an Airbyte error into something actionable. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  let errorId = "";
  try {
    const body = JSON.parse(text) as {
      message?: string;
      detail?: string;
      errorId?: string;
      _embedded?: { errors?: Array<{ message?: string }> };
    };
    errorId = String(body?.errorId ?? "");
    detail = body?.message ?? body?.detail ??
      body?._embedded?.errors?.[0]?.message ?? detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — Airbyte access tokens are valid for THREE MINUTES ` +
      "(24 hours on Self-Managed Enterprise), so this is far more often an expired token than a " +
      "wrong one. The runtime mints a fresh token from the application's client id and secret" +
      (errorId ? `. Airbyte gave only an error id: ${errorId}` : "");
  }
  if (status === 403) {
    return `${detail || "forbidden"} — the token authenticated and is not permitted. An Airbyte ` +
      "application inherits the permissions of the USER who created it, so what a workflow can " +
      "reach is whatever that person can reach";
  }
  if (status === 404) {
    return `${detail || "not found"} — no such id, or none this application's user can see. ` +
      "Airbyte does not distinguish the two";
  }
  if (status === 409) {
    return `${detail || "conflict"} — for a sync this usually means one is ALREADY RUNNING on ` +
      "this connection. Airbyte runs one job per connection at a time, and the second request " +
      "is refused rather than queued";
  }
  return (detail || `HTTP ${status}`) + (errorId ? ` [error ${errorId}]` : "");
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** `/health` answers plain text, not JSON. */
  text?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the credential — the runtime
 * routes every request through the auth `sign` hook, which carries a token
 * minted minutes ago at the outside.
 */
export class AirbyteClient {
  private host: string;

  constructor(private ctx: HookContext, host?: string) {
    this.host = host ?? hostFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.host}/v1${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.text ? "*/*" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `Airbyte ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }

    if (res.status === 204 || !text) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Airbyte did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/** How long a job took, in seconds, from the fields Airbyte reports. */
export function jobDurationSeconds(
  job: { startTime?: string; lastUpdatedAt?: string },
): number | undefined {
  const started = job?.startTime ? Date.parse(job.startTime) : NaN;
  const ended = job?.lastUpdatedAt ? Date.parse(job.lastUpdatedAt) : NaN;
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return undefined;
  return Math.max(0, Math.round((ended - started) / 1000));
}
