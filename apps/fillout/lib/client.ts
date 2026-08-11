import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Fillout REST API v1 client.
 *
 * Everything in this module was verified on 2026-08-11 against Fillout's own
 * OpenAPI 3.0.1 fragments — one per endpoint, served by their Mintlify docs at
 * `fillout.com/help/api-reference/<page>.md` and reachable from the index at
 * `fillout.com/help/llms.txt` — plus live probes against `api.fillout.com` and
 * `eu-api.fillout.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The docs site is real, not a catch-all: the eight reference pages answer 200
 * with eight distinct bodies (1,501–13,832 bytes, eight distinct md5s) while
 * `api-reference/definitely-not-a-real-page-zzz.md` answers **404** with a
 * 4-byte body.
 *
 * ## One version, and it is alive
 *
 * The only documented version is `v1`, and the reference carries no
 * deprecation notice: grepping the rendered reference (461,842 bytes), all
 * eight OpenAPI fragments and the 53,291-byte doc index for
 * `deprecat|depreciat|sunset|will be removed|end of life|retire|no longer
 * supported|legacy` returns **zero** matches. Asked the sharper way — which
 * version's page lacks a deprecation banner — the answer is the only version
 * there is. `https://api.fillout.com/v2/api/forms` answers `404 Not Found`,
 * byte-identical to any other unrouted path, so there is no successor to
 * migrate to.
 *
 * ## Two hosts, one path prefix
 *
 * The `servers` block of every fragment lists exactly two origins:
 * `https://api.fillout.com/v1/api` (US) and `https://eu-api.fillout.com/v1/api`
 * (EU). Both were probed live and behave identically. Which one an account
 * belongs to is not derivable from the credential, so it is collected on the
 * Connection (`auth/api-key.ts`) and read back from `ctx.connection.display`
 * here — never from the credential, which no Action may see.
 *
 * Fillout also supports self-hosting, where the base URL is whatever the
 * customer's dashboard shows. That case is deliberately NOT supported: serving
 * it would mean either enumerating hosts a manifest cannot know or declaring
 * `network.allow: ["*"]`, which disables egress restriction for every
 * Connection including the SaaS ones. See the README.
 *
 * ## No envelope
 *
 * Unlike most APIs of this shape, Fillout wraps nothing. `GET /forms` answers a
 * bare JSON array; the submission endpoints answer their own named object
 * (`{responses, totalResponses, pageCount}`, `{submission}`, `{submissions}`);
 * `POST /webhook/create` answers `{id}`. So there is one `json()` method and no
 * unwrapping step to get wrong.
 *
 * ## Errors
 *
 * Every failure observed on the wire is
 * `{"statusCode": n, "error": "<HTTP reason>", "message": <string>}`. The
 * `message` is either a sentence or a **JSON-encoded array of Zod issues** —
 * see {@link parseIssues}. There is no machine-readable error code anywhere in
 * the body, which is why {@link classifyCredentialMessage} matches on prose.
 *
 * ## Rate limit
 *
 * 5 requests per second per account/API key — the tightest in this pack by an
 * order of magnitude. Responses carry the IETF `ratelimit-*` header set
 * (`ratelimit-limit: 5`, `ratelimit-policy: 5;w=1`, `ratelimit-remaining`,
 * `ratelimit-reset`) and a `429` adds `retry-after: 1`. `health/request-rate.ts`
 * reads them.
 */

/** The regions Fillout documents as `servers`. */
export type FilloutRegion = "us" | "eu";

/** Hostname per region. Both are in `w6w.network.allow`; both are really called. */
export function apiHost(region: FilloutRegion): string {
  return region === "eu" ? "eu-api.fillout.com" : "api.fillout.com";
}

/** Every documented path hangs off this prefix. `/v2/...` does not exist. */
export const API_PREFIX = "/v1/api";

/**
 * Which region this Connection lives in.
 *
 * Read from the Connection's display data, which `auth/api-key.ts#afterConnect`
 * populates from the region the user picked at connect time. An Action never
 * sees the credential, so this is the only place the host can come from — and
 * the default is US, which is what the vendor calls "typical".
 */
export function regionFromConnection(connection: RedactedConnection | undefined): FilloutRegion {
  const display = (connection?.display ?? {}) as { region?: string };
  return display.region === "eu" ? "eu" : "us";
}

/** `https://api.fillout.com/v1/api` or the EU equivalent. */
export function baseUrl(connection: RedactedConnection | undefined): string {
  return `https://${apiHost(regionFromConnection(connection))}${API_PREFIX}`;
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  /** Serialized as JSON with `content-type: application/json`. */
  body?: unknown;
}

/** The error envelope, in the exact shape observed on the wire. */
export interface FilloutErrorBody {
  statusCode?: number;
  error?: string;
  message?: unknown;
}

/** One entry of the Zod issue array Fillout stringifies into `message`. */
export interface FilloutIssue {
  code?: string;
  expected?: string;
  path?: unknown[];
  message?: string;
}

/** Keep an error message readable — an issue list can be long. */
export function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… (${text.length} bytes truncated)`;
}

/** Drop keys the caller left unset, so an empty form field is not sent as `""`. */
export function compact(obj: Record<string, QueryValue>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Path-escape a caller-supplied id.
 *
 * A form id or submission id is pasted by a human from a URL, so a stray `/`
 * or `?` must not be able to re-point the request at a different route.
 */
export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site.
 */
export function asJson<T>(value: unknown, label: string): T {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Fillout's `message` is sometimes a **stringified** array of Zod issues rather
 * than a sentence:
 *
 * ```json
 * {"statusCode":400,"error":"Bad Request",
 *  "message":"[\n  {\n    \"expected\": \"array\", … }]"}
 * ```
 *
 * (measured 2026-08-11 from `POST /v1/api/forms/abc/submissions` with body
 * `{}`). Returns the parsed issues, or `undefined` when the message is prose.
 */
export function parseIssues(message: unknown): FilloutIssue[] | undefined {
  if (typeof message !== "string") return undefined;
  const text = message.trim();
  if (!text.startsWith("[")) return undefined;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed as FilloutIssue[] : undefined;
  } catch {
    return undefined;
  }
}

/** `submissions.0.questions: Invalid input: expected array` */
export function formatIssues(issues: FilloutIssue[]): string {
  return issues
    .map((issue) => {
      const path = Array.isArray(issue.path) && issue.path.length > 0
        ? issue.path.map((p) => String(p)).join(".")
        : "(body)";
      return `${path}: ${issue.message ?? issue.code ?? "invalid"}`;
    })
    .join("; ");
}

/**
 * What Fillout is telling us about the credential — derived from the message
 * text, never from the status code.
 *
 * **The status code carries no information here.** Every one of these is a
 * `400 Bad Request`, measured live on 2026-08-11 against
 * `GET https://api.fillout.com/v1/api/forms`:
 *
 * | Sent                              | Status | `message`                             |
 * | --------------------------------- | ------ | ------------------------------------- |
 * | no `Authorization` header          | 400    | `API authorization header missing`    |
 * | `Authorization: Bearer ` (empty)   | 400    | `API Authorization header missing`    |
 * | `Authorization: Basic …`           | 400    | `API Authorization header missing`    |
 * | `Authorization: Bearer notreal`    | 400    | `API key missing underscore`          |
 * | `Authorization: Bearer sk_x_yyy`   | 400    | `API Key invalid`                     |
 *
 * There is no 401 and no 403 on this API, and there is no machine-readable
 * error code in the body — so prose is all there is.
 *
 * Note rows one and two: the *only* difference between "no header arrived" and
 * "a header arrived that was not a usable Bearer" is the capital `A` in
 * `Authorization`. That is not a contract anyone wrote down, so this function
 * lowercases first and folds both into `missing`; the operator's fix
 * (reconnect) is the same either way, and keying off one letter's case would be
 * a coin flip on the next deploy.
 */
export type CredentialVerdict = "missing" | "malformed" | "rejected" | "other";

export function classifyCredentialMessage(message: unknown): CredentialVerdict {
  const text = typeof message === "string" ? message.toLowerCase() : "";
  if (!text) return "other";
  if (text.includes("authorization header missing")) return "missing";
  if (text.includes("missing underscore")) return "malformed";
  if (text.includes("api key invalid")) return "rejected";
  return "other";
}

/** Human sentence for a {@link CredentialVerdict}, safe to show a connection owner. */
export function credentialAdvice(verdict: CredentialVerdict): string {
  switch (verdict) {
    case "missing":
      return "Fillout received no usable Bearer credential — the API key did not reach the " +
        "request. Reconnect this connection.";
    case "malformed":
      return "Fillout rejected the API key's format (it expects an underscore in the key). " +
        "Copy the whole key from Settings → Developer, including its prefix.";
    case "rejected":
      return "Fillout rejected the API key. Check it has not been regenerated or revoked in " +
        "Settings → Developer.";
    default:
      return "Fillout refused the request without naming a credential problem.";
  }
}

/**
 * Turn a Fillout failure into one actionable line.
 *
 * Two things this must not do, both of which are easy to get wrong on this API:
 *
 *  1. **Do not read `400` as "bad credential".** `POST /v1/api/forms/{formId}/submissions`
 *     validates its body *before* it authenticates — an unauthenticated call
 *     with `{}` answers a `400` carrying a Zod issue list and no mention of
 *     auth at all (measured 2026-08-11). The sibling `POST /v1/api/webhook/create`
 *     with an equally invalid body answers the *auth* error instead, so the
 *     ordering is per-route and cannot be assumed.
 *  2. **Do not read `400` as "bad request" either** — for every other route in
 *     this app, a missing or rejected credential is also a `400`.
 *
 * So the classification comes from the body, and the raw message survives into
 * the thrown error either way.
 */
export function formatFilloutError(
  status: number,
  method: string,
  path: string,
  raw: string,
): string {
  let parsed: FilloutErrorBody | null = null;
  try {
    parsed = JSON.parse(raw) as FilloutErrorBody;
  } catch { /* not JSON — fall through to the raw body */ }

  if (!parsed || typeof parsed !== "object") {
    return truncate(`Fillout ${status} for ${method} ${path}: ${raw}`);
  }

  const issues = parseIssues(parsed.message);
  if (issues && issues.length > 0) {
    return truncate(
      `Fillout ${status} for ${method} ${path}: request body rejected — ${formatIssues(issues)}`,
      1000,
    );
  }

  const message = typeof parsed.message === "string" ? parsed.message : undefined;
  const verdict = classifyCredentialMessage(message);
  const parts = [
    `Fillout ${status} ${parsed.error ?? "error"} for ${method} ${path}`,
    message,
    verdict !== "other" ? credentialAdvice(verdict) : undefined,
    status === 429
      ? "Fillout allows 5 requests/second per API key; retry after the reset the ratelimit-reset " +
        "header names (1 second)"
      : undefined,
  ].filter(Boolean);
  return truncate(parts.join(": "), 1000);
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets a credential header — the
 * runtime routes every request through the Auth `sign` hook, which is the only
 * code handed the API key.
 */
export class FilloutClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(ctx.connection);
  }

  /** Parse the JSON body. `204`/empty answers `undefined`. */
  async json<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, options);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** Status only, for endpoints documented with no response schema (delete). */
  async status(path: string, options: RequestOptions = {}): Promise<number> {
    const res = await this.send(path, options);
    return res.status;
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
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
      const detail = await res.text().catch(() => "");
      throw new Error(formatFilloutError(res.status, init.method ?? "GET", url.pathname, detail));
    }
    return res;
  }
}
