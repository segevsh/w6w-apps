import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Gotify's REST API — verified against the OpenAPI (Swagger 2.0) document the
 * project publishes at `docs/spec.json` in `gotify/server`
 * (https://raw.githubusercontent.com/gotify/server/master/docs/spec.json,
 * fetched 2026-09-15, `info.version: "2.1.0"`) and cross-checked against the
 * handler source in the same repo (`api/*.go`, `auth/authentication.go`,
 * `router/router.go`) for the behaviour the spec document doesn't state.
 *
 * **There is no vendor host.** Gotify is self-hosted software — there is no
 * `api.gotify.net` to call, only whichever instance an operator is running. So
 * the base URL is a connection field and the app's egress allowlist is `["*"]`,
 * the posture this pack already uses for `gitea`, `mautic`, `tableau` and
 * `bubble`.
 *
 * There is no `basePath` in the spec — every path below is relative to the
 * instance root.
 */
export const API_PATH = "";

/** Public (redacted-safe) connection metadata. */
export interface GotifyConnectionDisplay {
  /** The instance origin, e.g. `https://gotify.example.com`. */
  baseUrl?: string;
  /** The account name the client token belongs to. */
  name?: string;
  /** Whether that account is a Gotify admin. */
  admin?: boolean;
}

/**
 * Normalise a user-typed instance URL into a bare origin.
 *
 * People paste `gotify.example.com`, `https://gotify.example.com/`, and links
 * ending in `/message` or `/stream` copied straight out of a client app's
 * settings screen — all of them name the same server.
 *
 * A missing scheme defaults to `https`: a token in flight deserves TLS, and an
 * operator on a bare local network can still type `http://` explicitly.
 */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("Gotify URL is empty");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`Gotify URL is not a valid URL: ${trimmed}`);
  }
  if (!url.hostname) throw new Error(`Gotify URL has no host: ${trimmed}`);
  return `${url.protocol}//${url.host}`;
}

/** Read the instance origin off the redacted Connection. Never touches the credential. */
export function baseUrlFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as GotifyConnectionDisplay;
  if (display.baseUrl) return normalizeBaseUrl(display.baseUrl);
  throw new Error(
    "this Gotify connection records no instance URL — reconnect it so the URL can be stored",
  );
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

/** Coerce an optional numeric param, treating `""`/`null`/`undefined` as unset. */
export function num(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return Number(value);
}

/** Drop keys the caller left unset so a PUT does not clear untouched fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Gotify's error envelope, returned on every non-2xx response:
 * `{"error": "Unauthorized", "errorCode": 401, "errorDescription": "..."}`.
 * `errorDescription` is what actually says what went wrong — `error` alone is
 * just the HTTP reason phrase repeated.
 */
export interface GotifyErrorBody {
  error?: string;
  errorCode?: number;
  errorDescription?: string;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential header itself —
 * the runtime routes every request through the auth `sign` hook, which stamps
 * `X-Gotify-Key`.
 */
export class GotifyClient {
  readonly base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrlFromConnection(ctx.connection);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const body = await res.json().catch(() => null) as GotifyErrorBody | null;
      const detail = body?.errorDescription ?? body?.error ?? await res.text().catch(() => "");
      throw new Error(
        `Gotify ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
