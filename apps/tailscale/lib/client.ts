import type { HookContext } from "@w6w/types";

/**
 * The Tailscale API v2 — built against the live OpenAPI 3.1 spec that
 * `https://api.tailscale.com/api/v2?outputOpenapiSchema=true` serves, and
 * probed live on 2026-08-19.
 *
 * ## There is no pagination. At all.
 *
 * Tailscale's own words in the spec: "The Tailscale API does not currently
 * support pagination. All results are returned at once." A tailnet with five
 * thousand devices returns five thousand devices in one response, and there is
 * no cursor to loop on and no page size to lower.
 *
 * So the filtering matters more here than it usually would. `/devices` supports
 * **server-side** `<field>=<value>` filters — exact matches, ANDed together —
 * and `device-list` uses them rather than fetching everything and filtering in
 * the workflow.
 *
 * ## Two credentials, one error message
 *
 * An API access token (`tskey-api-…`) is a *user's* token with that user's
 * permissions, and expires in 1 to 90 days. A trust credential — an OAuth
 * client, `tskey-client-…` — does not expire, is not tied to a person, and
 * mints short-lived scoped access tokens on demand.
 *
 * Verified live: a bad token and a bad OAuth client **both** return
 * `{"message":"API token invalid"}` with HTTP 401. The error cannot tell you
 * which kind of credential is wrong, so `describeError` names both cases.
 *
 * ## The tailnet is `-`
 *
 * Every tailnet-scoped path takes a tailnet identifier, and `-` means "the
 * default tailnet of whatever credential is calling". That is the right answer
 * for nearly everybody, and it is what this app defaults to — an explicit
 * tailnet id is offered on the connection for the rare case of a credential
 * with access to several.
 *
 * ## No rate-limit headers, and a request id worth keeping
 *
 * Measured: no `RateLimit-*`, no `X-RateLimit-*`, no `Retry-After` on a
 * rejected request. What there *is* is `x-tailscale-request-id`, which
 * Tailscale support can trace — so `request()` puts it into the error message,
 * because by the time somebody opens a ticket the response is long gone.
 */

export const API = "https://api.tailscale.com/api/v2";

/** The default tailnet of the calling credential. */
export const DEFAULT_TAILNET = "-";

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

/** Which tailnet a connection speaks for — `-` unless one was named. */
export function tailnetFrom(connection: unknown): string {
  const display = (connection as { display?: Record<string, unknown> } | undefined)?.display;
  const named = String(display?.tailnet ?? "").trim();
  return named || DEFAULT_TAILNET;
}

/**
 * Validate an ACL tag.
 *
 * Tags are `tag:name`, and a bare name is the commonest mistake. Tailscale
 * rejects it with a message about the tag not existing in the policy file,
 * which reads as "somebody forgot to define it" rather than "you left off the
 * prefix" — two very different fixes.
 */
export function assertTags(tags: string[], field: string): void {
  const bad = tags.filter((tag) => !/^tag:[a-zA-Z0-9-]+$/.test(tag));
  if (!bad.length) return;
  throw new Error(
    `\`${field}\` entries must look like \`tag:name\` — these do not: ${bad.join(", ")}. ` +
      "Tailscale rejects a bare name with a message about the tag not existing in the policy " +
      "file, which reads as a missing definition rather than a missing prefix",
  );
}

/** The two CIDRs that make a device an exit node rather than a subnet router. */
export const EXIT_NODE_ROUTES = ["0.0.0.0/0", "::/0"];

/** Whether a route list amounts to an exit node. */
export function isExitNode(routes: string[]): boolean {
  return EXIT_NODE_ROUTES.some((route) => routes.includes(route));
}

/** Turn a Tailscale error into something actionable. */
export function describeError(status: number, text: string, requestId?: string | null): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { message?: string };
    detail = body?.message ?? detail;
  } catch { /* not JSON */ }

  let hint = "";
  if (status === 401) {
    hint = " — Tailscale answers `API token invalid` for BOTH a bad API access token and a bad " +
      "OAuth client, so the message does not say which credential is wrong. An API access token " +
      "also expires after 1 to 90 days, and nothing warns before it does";
  } else if (status === 403) {
    hint = " — the credential authenticated and is not permitted here. An OAuth client carries " +
      "SCOPES (`devices:core:read` and the like) while a user's API token carries that user's " +
      "role, so the same call can be allowed for one and refused for the other";
  } else if (status === 404) {
    hint = " — not found. A tailnet-scoped path takes `-` for the calling credential's own " +
      "tailnet; a device takes its `nodeId`, and a device that left the tailnet is gone rather " +
      "than marked absent";
  } else if (status === 504) {
    hint = " — Tailscale timed out processing the request. The spec names this on the device " +
      "list specifically, and there is no pagination to make the request smaller with";
  }

  // By the time somebody opens a support ticket the response is long gone.
  const trace = requestId ? ` [request ${requestId}]` : "";
  return `${detail || `HTTP ${status}`}${hint}${trace}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** The policy file is HuJSON, and asking for JSON silently drops its comments. */
  accept?: string;
  /** Several endpoints answer with a body that is not JSON. */
  text?: boolean;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the credential — the runtime
 * routes every request through the auth `sign` hook.
 */
export class TailscaleClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.accept ?? (options.text ? "*/*" : "application/json"),
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    const requestId = res.headers.get("x-tailscale-request-id");

    if (!res.ok) {
      throw new Error(
        `Tailscale ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text, requestId)
        }`,
      );
    }

    if (res.status === 204 || !text) return undefined as T;
    if (options.text) return text as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Tailscale did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}
