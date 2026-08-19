import type { HookContext } from "@w6w/types";

/**
 * Storyblok — **two APIs**, two credentials, two hosts, and a rate limit that
 * works backwards. Built against the vendor's own documentation and probed
 * live on 2026-08-19.
 *
 * ## The two APIs are not variations of each other
 *
 * | | Content Delivery | Management |
 * | --- | --- | --- |
 * | Host (EU) | `api.storyblok.com/v2/cdn` | `mapi.storyblok.com/v1` |
 * | Credential | space token, as a **query parameter** | personal access token, in a **header** |
 * | Scope | one space, read-only | every space the account can reach |
 * | Rate limit | 6–1000 per second | **3–6 per second** |
 *
 * They do not share a credential, so this app has two auth methods and every
 * action names which it needs. A management token used on the delivery API is
 * a 401 that says `Unauthorized` and nothing else, so `assertCredential`
 * refuses before the request rather than after.
 *
 * ## The Management API's header takes the token raw
 *
 * `Authorization: <personal access token>` — no `Bearer`, no scheme. Sending
 * `Bearer <token>` is a 401 identical to a wrong token.
 *
 * ## Outside the EU, the hosts overlap confusingly
 *
 * | Region | Delivery | Management |
 * | --- | --- | --- |
 * | EU | `api.storyblok.com` | `mapi.storyblok.com` |
 * | US | `api-us.storyblok.com` | `api-us.storyblok.com` |
 * | Canada | `api-ca.storyblok.com` | `api-ca.storyblok.com` |
 * | Australia | `api-ap.storyblok.com` | `api-ap.storyblok.com` |
 *
 * Outside the EU both APIs live on one host and are told apart by the path —
 * `/v2/cdn` against `/v1`. And a space exists in exactly one region: pointing
 * a US space's token at the EU host is a 401, indistinguishable from a wrong
 * token. `describeError` names that case, because it is the one people lose an
 * afternoon to.
 *
 * ## The delivery rate limit falls as the page size rises
 *
 * From Storyblok's own table:
 *
 * | Request | Limit |
 * | --- | --- |
 * | Cached (with `cv`) | 1000/s |
 * | Single story, or ≤25 per page | 50/s |
 * | 25–50 per page | 15/s |
 * | 50–75 per page | 10/s |
 * | 75–100 per page | 6/s |
 *
 * So asking for 100 entries per page instead of 25 costs **eight times** the
 * rate limit, and the arithmetic runs the opposite way to intuition: 25 per
 * page at 50/s is 1,250 entries a second, while 100 per page at 6/s is 600.
 * Fetching fewer per request moves more content. `throughputFor` computes it,
 * and `story-list` warns when a caller raises the page size past 25.
 *
 * ## `cv` is the difference between 50 and 1000 requests a second
 *
 * Every delivery response carries a `cv` — a space-wide counter that changes
 * when content is published. A request *with* a matching `cv` is served from
 * CloudFront; one without is redirected to acquire one and then hits the
 * backend. Fetching the current `cv` once from `/cdn/spaces/me` and passing it
 * to every later call is the single biggest thing a workflow can do here, and
 * every delivery action returns the `cv` it saw so the next call can use it.
 */

/** Delivery hosts, by the region a space lives in. */
export const DELIVERY_HOSTS: Record<string, string> = {
  eu: "https://api.storyblok.com",
  us: "https://api-us.storyblok.com",
  ca: "https://api-ca.storyblok.com",
  ap: "https://api-ap.storyblok.com",
  cn: "https://app.storyblokchina.cn",
};

/** Management hosts. Only the EU differs from its delivery host. */
export const MANAGEMENT_HOSTS: Record<string, string> = {
  eu: "https://mapi.storyblok.com",
  us: "https://api-us.storyblok.com",
  ca: "https://api-ca.storyblok.com",
  ap: "https://api-ap.storyblok.com",
  cn: "https://app.storyblokchina.cn",
};

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

/** Which credential a connection holds. */
export type CredentialKind = "delivery" | "management";

interface Display {
  region?: string;
  spaceId?: string | number;
  credentialKind?: string;
}

function display(connection: unknown): Display {
  return ((connection as { display?: Display } | undefined)?.display ?? {}) as Display;
}

export function regionOf(connection: unknown): string {
  const region = String(display(connection).region ?? "eu").toLowerCase();
  return region in DELIVERY_HOSTS ? region : "eu";
}

export function spaceIdOf(connection: unknown): string {
  return String(display(connection).spaceId ?? "").trim();
}

export function credentialKindOf(connection: unknown): CredentialKind {
  return display(connection).credentialKind === "management" ? "management" : "delivery";
}

/**
 * Refuse before the request when the connection holds the wrong credential.
 *
 * Storyblok's own answer is a bare `{"error":"Unauthorized"}`, which is what a
 * revoked token, a wrong region and a wrong *kind* of token all look like.
 * Only one of those is worth a person's afternoon.
 */
export function assertCredential(connection: unknown, needed: CredentialKind): void {
  const held = credentialKindOf(connection);
  if (held === needed) return;
  if (needed === "management") {
    throw new Error(
      "this action needs a MANAGEMENT connection — a personal access token — and this connection " +
        "holds a space delivery token. Delivery tokens are read-only by design: they cannot " +
        "create, update, publish or delete anything. Connect the app again with the " +
        "`management-token` method",
    );
  }
  throw new Error(
    "this action reads through the CONTENT DELIVERY API, which needs a space access token, and " +
      "this connection holds a management personal access token. The two are separate " +
      "credentials on separate hosts — connect again with the `delivery-token` method, or use " +
      "`story-search`, which reads the same content through the Management API",
  );
}

/** Storyblok's own rate-limit table for the delivery API, entries per page. */
export function rateLimitFor(perPage: number): number {
  if (perPage <= 25) return 50;
  if (perPage <= 50) return 15;
  if (perPage <= 75) return 10;
  return 6;
}

/** Entries per second at a given page size — the number that runs backwards. */
export function throughputFor(perPage: number): number {
  return rateLimitFor(perPage) * perPage;
}

/**
 * Check the shape rules Storyblok imposes on story content.
 *
 * Every component object needs a `component` naming its type, and every
 * *nested* one needs a `_uid` as well. Storyblok rejects a missing `_uid` with
 * a message about the field rather than about the rule, and a story that
 * imports without one renders as an empty block in the editor — visible only
 * to whoever opens it next.
 */
export function validateContent(content: unknown): string[] {
  const problems: string[] = [];
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return ["`content` must be an object at the root level"];
  }
  const root = content as Record<string, unknown>;
  if (!root.component) {
    problems.push("the root content object needs a `component` property naming its content type");
  }

  const walk = (value: unknown, path: string, nested: boolean): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`, true));
      return;
    }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (node.component && nested && !node._uid) {
      problems.push(`${path} is a nested \`${node.component}\` component with no \`_uid\``);
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === "component" || key === "_uid") continue;
      walk(child, `${path}.${key}`, true);
    }
  };
  for (const [key, child] of Object.entries(root)) {
    if (key === "component" || key === "_uid") continue;
    walk(child, `content.${key}`, true);
  }
  return problems;
}

/** Turn a Storyblok error into something actionable. */
export function describeError(status: number, text: string, kind: CredentialKind): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    detail = body?.error ?? body?.message ?? detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail || "unauthorized"} — Storyblok answers a bare "Unauthorized" for every ` +
      "credential problem, so this is one of three things: the token is wrong; the SPACE IS IN " +
      "ANOTHER REGION and this is the wrong host, which looks identical" +
      (kind === "management"
        ? "; or the token was sent with a `Bearer` prefix, which the Management API does not use"
        : "; or it is a management token, which the delivery API does not accept");
  }
  if (status === 403) {
    return `${detail || "forbidden"} — the token authenticated and lacks the permission. A ` +
      "personal access token carries a permission per resource type and may be limited to " +
      "selected spaces, so a token that lists stories can be unable to publish one";
  }
  if (status === 404) {
    return `${detail || "not found"} — for a story, note the delivery API serves DRAFT and ` +
      "PUBLISHED separately: an unpublished story is a 404 to a public token and present to a " +
      "preview one";
  }
  if (status === 422) {
    return `${detail || "unprocessable"} — Storyblok rejected the content. Every component ` +
      "object needs a `component` property, and every nested one a `_uid`; the message names " +
      "the field rather than the rule";
  }
  if (status === 429) {
    return `${detail || "rate limited"} — the delivery API allows 50 requests a second for ` +
      "pages of 25 and only 6 for pages of 100, and the Management API allows 3 to 6 a second " +
      "depending on plan. Passing the `cv` cache version raises the delivery limit to 1000";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

/** A delivery response, with the cache version that makes the next one cheap. */
export interface DeliveryResult<T> {
  data: T;
  cv?: number;
  total?: number;
  perPage?: number;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the credential — the runtime
 * routes every request through the auth `sign` hook, which knows whether this
 * connection's token belongs in a header or the query string.
 */
export class StoryblokClient {
  private region: string;
  private kind: CredentialKind;

  constructor(private ctx: HookContext) {
    this.region = regionOf(ctx.connection);
    this.kind = credentialKindOf(ctx.connection);
  }

  /** The Content Delivery API. */
  async delivery<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<DeliveryResult<T>> {
    const host = DELIVERY_HOSTS[this.region] ?? DELIVERY_HOSTS.eu;
    const { body, headers } = await this.send(`${host}/v2/cdn${path}`, options, "delivery");
    const envelope = body as { cv?: number } | undefined;
    return {
      data: body as T,
      cv: envelope?.cv,
      // Storyblok reports paging in headers rather than the body.
      total: numberFrom(headers.get("total")),
      perPage: numberFrom(headers.get("per-page")),
    };
  }

  /** The Management API. */
  async management<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const host = MANAGEMENT_HOSTS[this.region] ?? MANAGEMENT_HOSTS.eu;
    const { body } = await this.send(`${host}/v1${path}`, options, "management");
    return body as T;
  }

  /** The Management API, keeping the paging headers. */
  async managementList<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ data: T; total?: number; perPage?: number }> {
    const host = MANAGEMENT_HOSTS[this.region] ?? MANAGEMENT_HOSTS.eu;
    const { body, headers } = await this.send(`${host}/v1${path}`, options, "management");
    return {
      data: body as T,
      total: numberFrom(headers.get("total")),
      perPage: numberFrom(headers.get("per-page")),
    };
  }

  private async send(
    url: string,
    options: RequestOptions,
    api: CredentialKind,
  ): Promise<{ body: unknown; headers: Headers }> {
    const target = new URL(url);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      target.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(target.toString(), init);
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(
        `Storyblok ${res.status} for ${init.method} ${target.pathname}: ${
          describeError(res.status, text, api)
        }`,
      );
    }

    if (res.status === 204 || !text) return { body: undefined, headers: res.headers };
    try {
      return { body: JSON.parse(text), headers: res.headers };
    } catch {
      throw new Error(`Storyblok did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

function numberFrom(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
