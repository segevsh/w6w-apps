/**
 * BambooHR API v1 — verified against the vendor's own sources on 2026-08-03:
 *
 *   - the current documentation site <https://documentation.bamboohr.com/docs>,
 *     whose every page is also served as Markdown by appending `.md` (which is
 *     how the prose quoted throughout this app was read), plus its machine
 *     index at <https://documentation.bamboohr.com/llms.txt>;
 *   - the OpenAPI 3.1 documents embedded in each `documentation.bamboohr.com/
 *     reference/<operationId>.md` page, which is where every path, method,
 *     query parameter and request schema in this app comes from.
 *
 * Three things about this API are unusual enough to state up front, because
 * getting any of them wrong fails quietly rather than loudly.
 *
 * ## 1. The host is per-customer, and the docs moved
 *
 * There is no single `api.bamboohr.com` in the current surface. Every BambooHR
 * customer gets its own subdomain, and the OpenAPI `servers` block on every
 * reference page is a template over exactly that and nothing else:
 *
 *     "servers": [{
 *       "url": "https://{companyDomain}.bamboohr.com",
 *       "variables": { "companyDomain": { "default": "companySubDomain", ... } }
 *     }]
 *
 * The Technical Overview says the same in prose — "API requests are made to a
 * URL that begins with `https://{companyDomain}.bamboohr.com/api/`" — and the
 * Getting Started page's only curl sample is:
 *
 *     curl -i -u "{API Key}:x" "https://{companyDomain}.bamboohr.com/api/v1/employees/directory"
 *
 * So `companyDomain` is a property of the CONNECTION, not of a call. It is
 * collected once as an Auth field, republished as `connection.display.subdomain`
 * by `afterConnect`, and turned into a base URL here — the same shape
 * `chargebee`, `wordpress`, `ghost` and `gravityforms` use for their per-tenant
 * hosts. Actions only ever see the redacted Connection, never the credential.
 *
 * ### The legacy `gateway.php` form, and why this app does not use it
 *
 * Older integrations (n8n's BambooHR node among them, which still ships
 * `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/${endpoint}`)
 * address a fixed host and put the subdomain in the PATH instead. That form
 * embeds the customer identifier once as a path segment rather than as the
 * hostname.
 *
 * It is not in the current documentation anywhere: it appears in no `servers`
 * block, in no curl sample, and in none of the 345 reference pages listed by
 * `llms.txt`. This app therefore implements the **documented** form. The
 * decision is deliberate and is recorded in the README rather than buried here:
 * an undocumented alias is exactly the kind of surface that disappears without
 * a deprecation notice, and the documented one is what the vendor's own
 * machine-readable spec generates clients against.
 *
 * Because the host is per-customer, the manifest declares the narrow wildcard
 * `"*.bamboohr.com"` — the form the spec defines as "any subdomain at any depth,
 * NOT the apex" — rather than the blanket `"*"`. A fixed `api.bamboohr.com`
 * would NOT cover the documented host and every call would be denied by the
 * sandbox.
 *
 * ## 2. Responses default to XML
 *
 * This is the single easiest way to break a BambooHR integration, and the
 * documentation states it outright in the `list-employee-files` parameter table:
 *
 *   > `Accept` (header), default `application/xml` — "Set to `application/json`
 *   > to receive a JSON response. **Any other value (or omitted) returns XML.**"
 *
 * The compatibility section of the Technical Overview assumes XML too ("API
 * consumers should ignore any XML tags and attributes they do not recognize"),
 * and several endpoints expose a redundant `format=json` query parameter
 * precisely because the header is so often forgotten — `list-list-fields`
 * documents it as "Set to `json` to receive JSON output as an alternative to
 * using the Accept header."
 *
 * A missing `Accept` header does not error. It returns a 200 with an XML body,
 * which a JSON parser then chokes on far from the cause. So `BambooClient` sets
 * `accept: application/json` on EVERY request from one place, and
 * `tests/lib/client.test.ts` asserts it for every action in the app rather than
 * trusting that each call site remembered.
 *
 * ## 3. `fields` is opt-in — there is no "give me everything"
 *
 * `GET /api/v1/employees/{id}` returns only `id` unless fields are named. The
 * reference page is explicit: "Every other field is included only when
 * explicitly named in the `fields` query parameter. With no `fields` parameter,
 * the response contains only `id` — there is no implicit default field set."
 * The ceiling is 400 fields per request.
 *
 * Three reference forms are accepted and may be mixed: standard names
 * (`firstName`), numeric field IDs (`1349`), and custom-field aliases
 * (`customStartDate`). Discover all three with the List Fields action.
 *
 * The vocabulary differs per endpoint, which is a genuine trap:
 * `GET /employees/{id}` uses short names (`workEmail`, `jobTitle`, `department`,
 * `supervisor`) where the `employee` dataset uses qualified ones (`email`,
 * `jobInformationJobTitle`, `jobInformationDepartment`, `jobInformationReportsTo`).
 * `FIELDS_PARAM` says so at the form.
 *
 * Note also that `GET /employees/{id}` accepts ONLY the comma-separated form —
 * "Bracket-array (`fields[]=...`) and repeated-key (`fields=a&fields=b`) forms
 * are not supported on this endpoint" — whereas `GET /employees` also accepts
 * the bracket-array form. This app emits the comma-separated form everywhere,
 * which both accept.
 */
import type { HookContext } from "@w6w/types";

/** The API path prefix, identical on every customer host. */
export const API_PATH = "/api/v1";

/**
 * The apex every BambooHR customer lives under. Kept as a bare hostname rather
 * than a URL so no absolute URL literal exists in this file — the only host this
 * app talks to is computed from the Connection, and `w6w.network.allow` declares
 * the wildcard that covers it.
 */
export const BAMBOOHR_DOMAIN = "bamboohr.com";

/**
 * Public (redacted-safe) connection metadata. The auth method's `afterConnect`
 * hook publishes this onto `connection.display` so action code can compute the
 * base URL without ever touching the credential.
 */
export interface BambooConnectionDisplay {
  /** Bare company subdomain, e.g. `acme`. Never a URL. */
  subdomain?: string;
  /** The company's display name, straight from `GET /company_information`. */
  companyName?: string;
}

/**
 * Normalise whatever the user pasted into a bare subdomain.
 *
 * People supply this three ways and all three are reasonable: the subdomain on
 * its own (`acme`), the host (`acme.bamboohr.com`), or a whole URL copied out of
 * the browser or a doc example (`https://acme.bamboohr.com/api/v1/...`). Each
 * reduces to the same company.
 */
export function normalizeSubdomain(raw: string): string {
  let sub = String(raw ?? "").trim().toLowerCase();
  sub = sub.replace(/^https?:\/\//, "");
  // Drop anything from the first `/` on — path, query, the `api/v1` suffix.
  sub = sub.replace(/[/?#].*$/, "");
  sub = sub.replace(new RegExp(`\\.${BAMBOOHR_DOMAIN.replace(/\./g, "\\.")}$`), "");
  return sub.replace(/^\.+|\.+$/g, "");
}

/**
 * A subdomain must be a single DNS label — it becomes the hostname.
 *
 * Rejecting a dotted value here rather than at request time is the difference
 * between a clear "that is not a company domain" at connect time and an opaque
 * egress denial from the sandbox much later. A value like `evil.example.com`
 * would otherwise be interpolated into `evil.example.com.bamboohr.com`, which is
 * at least still inside the allowlist — but the check costs nothing and removes
 * the whole class of question.
 */
export function isValidSubdomain(sub: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub);
}

/** `acme` -> `acme.bamboohr.com`. Throws on anything that is not a bare label. */
export function apiHost(subdomain: string): string {
  const normalized = normalizeSubdomain(subdomain);
  if (!normalized) throw new Error("BambooHR connection is missing a company domain");
  if (!isValidSubdomain(normalized)) {
    throw new Error(
      `"${normalized}" is not a BambooHR company domain — expected a single label such as ` +
        "`acme`, the part before `.bamboohr.com` in your BambooHR URL",
    );
  }
  return `${normalized}.${BAMBOOHR_DOMAIN}`;
}

/** `{ subdomain: "acme" }` -> `https://acme.bamboohr.com/api/v1`. */
export function resolveApiUrl(display: BambooConnectionDisplay | undefined): string {
  return `https://${apiHost(display?.subdomain ?? "")}${API_PATH}`;
}

/**
 * The `fields` `Param` the employee-read actions reuse.
 *
 * Stated at the form rather than only in the README because the failure mode is
 * silent: omit it and the call succeeds with a body containing nothing but `id`,
 * which looks like "this employee has no data" rather than "you did not ask for
 * any".
 */
export const FIELDS_PARAM = {
  key: "fields",
  label: "Fields",
  type: "string" as const,
  placeholder: "firstName,lastName,workEmail,jobTitle",
  hint: "Comma-separated field names to return. REQUIRED in practice: with no `fields`, BambooHR " +
    "returns only `id` — there is no implicit default set. Accepts standard names " +
    "(`firstName`), numeric field IDs (`1349`) and custom-field aliases (`customStartDate`), " +
    "mixed freely; discover all three with the List Fields action. Max 400 per request. Note " +
    "this endpoint family uses SHORT names (`workEmail`, `jobTitle`, `department`, `supervisor`) " +
    "where the `employee` dataset uses qualified ones (`email`, `jobInformationJobTitle`).",
};

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Thin wrapper over `ctx.fetch`.
 *
 * Note what is deliberately absent: this class never builds an `Authorization`
 * header. The runtime routes every request through the auth `sign` hook, which
 * is the only code handed the raw credential. An action that set the header
 * itself would both leak the credential into the network-capable worker and fail
 * the pack auditor.
 *
 * What is deliberately present, on every single request, is
 * `accept: application/json`. See the file header — without it BambooHR returns
 * XML with a 200 status.
 */
export class BambooClient {
  constructor(private ctx: HookContext) {}

  /**
   * The per-customer base URL, resolved from the Connection.
   *
   * Deliberately computed here rather than in the constructor. A missing or
   * malformed company domain throws, and doing that at construction time would
   * surface it SYNCHRONOUSLY — which, for an action written as
   * `execute(input, ctx) { return new BambooClient(ctx).request(...) }` rather
   * than as an `async` function, escapes past the returned promise entirely.
   * Resolving inside the async `request` makes every failure a rejection, so
   * both action styles behave identically.
   */
  private baseUrl(): string {
    return resolveApiUrl(this.ctx.connection?.display as BambooConnectionDisplay | undefined);
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl()}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.set(k, String(v));
      }
    }

    // `accept` first so a caller-supplied header can override it deliberately
    // (the file-download actions have a legitimate reason to), but never by
    // accident through omission.
    const headers: Record<string, string> = { accept: "application/json", ...options.headers };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      // BambooHR puts the human-readable reason in a HEADER, not the body:
      // "Most 400-level errors and some 500-level errors will include a header
      // `X-BambooHR-Error-Message`". Surfacing it turns an opaque 406 into
      // "references to non-existent fields".
      const hint = res.headers.get("x-bamboohr-error-message");
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* body already consumed or unreadable — the status still tells the story */ }
      throw new Error(
        `BambooHR ${res.status} ${res.statusText} for ${options.method ?? "GET"} ${url.pathname}: ${
          hint ?? ""
        }${hint && detail ? " — " : ""}${detail}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

/**
 * Drop keys whose value is `undefined` so an update never blanks a field the
 * caller simply did not mention.
 *
 * BambooHR's employee update is a field-set merge — "Update an employee's fields
 * by submitting a JSON object ... containing field name/value pairs" — so only
 * the keys present are touched. Serialising `undefined` away preserves that;
 * an explicit `null` or `""` survives on purpose, because clearing a field is a
 * legitimate thing to ask for.
 */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Merge a caller-supplied free-form field map into an employee request body.
 *
 * Both `create-employee` and `update-employee` document the same thing: the
 * request schema "lists commonly used fields, but any valid writable employee
 * field name may be included as a key". Enumerating the whole field set as
 * params would be both enormous and wrong (it is per-company — custom fields
 * exist), so the named params cover the common ones and this merges the rest.
 *
 * Named params win over the map on key collision: they are the more specific
 * statement of intent, and a form value silently losing to a JSON blob would be
 * baffling.
 */
export function withFields(
  named: Record<string, unknown>,
  extra?: Record<string, unknown> | null,
): Record<string, unknown> {
  return { ...(extra ?? {}), ...compact(named) };
}
