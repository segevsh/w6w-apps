import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Azure DevOps Services REST API — verified against Microsoft's own published
 * Swagger documents (`github.com/MicrosoftDocs/vsts-rest-api-specs`,
 * `specification/{core,git,build,wit}/7.1/*.json`, read 2026-08-18) and probed
 * live the same day.
 *
 * ## A wrong credential answers `302`, not `401`
 *
 * This is the finding that shapes the client. Probed 2026-08-18: a request to
 * `dev.azure.com/{org}/_apis/projects` with a bad token answers
 *
 * ```
 * HTTP/1.1 302 Found
 * Location: https://spsprodwus24.vssps.visualstudio.com/_signin?realm=dev.azure.com&reply_to=…
 * ```
 *
 * — a redirect to an interactive sign-in page. A client that follows redirects
 * gets **`200 OK` and a page of HTML**, which parses as neither JSON nor an
 * error, and the workflow sees a successful call that returned nothing.
 *
 * So every request here sends `redirect: "manual"` and treats any 3xx as an
 * authentication failure. Nothing else in this pack needs that, and getting it
 * wrong here is silent.
 *
 * ## `api-version` is required on every request
 *
 * Not a default, not optional — a request without it is rejected. The client
 * adds `api-version=7.1` to every call so no action has to remember, and pins
 * it rather than tracking `-preview` versions whose shapes move.
 *
 * ## Collections come back wrapped
 *
 * `{"count": 3, "value": [...]}`. The client unwraps `value` for list calls and
 * leaves single objects alone.
 *
 * ## The organization lives on the connection
 *
 * Every path is `/{organization}/{project}/_apis/…`. The organization is fixed
 * per credential, so it is recorded at connect time; the project varies per
 * call and is a parameter.
 */
export const BASE_URL = "https://dev.azure.com";

/**
 * The API version every request pins.
 *
 * 7.1 is the current generally-available version. Preview versions exist for
 * newer surfaces and their response shapes change without notice, which is not
 * a thing to build a workflow on.
 */
export const API_VERSION = "7.1";

/** Public (redacted-safe) connection metadata. */
export interface AzureDevOpsConnectionDisplay {
  /** The organization every path is scoped to. */
  organization?: string;
}

/** Read the organization off the redacted Connection. */
export function organizationFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as AzureDevOpsConnectionDisplay;
  const org = String(display.organization ?? "").trim();
  if (!org) {
    throw new Error(
      "this connection has no organization recorded — reconnect it so the app knows which Azure " +
        "DevOps organization to act on",
    );
  }
  return org;
}

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | Array<string | number> | undefined | null;

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /**
   * The content type for the body. Work items need
   * `application/json-patch+json` and everything else takes JSON.
   */
  contentType?: string;
}

/** Drop keys the caller left unset, so a filter is absent rather than empty. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** `compact` for a query string, keeping the value type the client expects. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      const items = v.map((i) => (typeof i === "number" ? i : String(i)));
      if (items.length === 0) continue;
      // Azure DevOps takes comma-delimited lists, not repeated keys.
      out[k] = items.join(",");
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else out[k] = String(v);
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
 * Work item fields are namespaced, and the namespace is not optional.
 *
 * `System.Title`, `System.State`, `System.AssignedTo`,
 * `Microsoft.VSTS.Common.Priority`. A caller who writes `title` is not
 * corrected — the field is simply not set, and the work item is created without
 * it.
 *
 * So the common System fields are expanded from their short names, and anything
 * already containing a dot is passed through untouched. A custom field
 * (`Custom.TeamArea`) therefore works, and so does `title`.
 */
const SYSTEM_FIELDS: Record<string, string> = {
  title: "System.Title",
  state: "System.State",
  reason: "System.Reason",
  assignedto: "System.AssignedTo",
  description: "System.Description",
  areapath: "System.AreaPath",
  iterationpath: "System.IterationPath",
  tags: "System.Tags",
  history: "System.History",
  priority: "Microsoft.VSTS.Common.Priority",
  severity: "Microsoft.VSTS.Common.Severity",
  storypoints: "Microsoft.VSTS.Scheduling.StoryPoints",
  reprosteps: "Microsoft.VSTS.TCM.ReproSteps",
  acceptancecriteria: "Microsoft.VSTS.Common.AcceptanceCriteria",
};

export function qualifyField(name: string): string {
  const trimmed = name.trim();
  if (trimmed.includes(".")) return trimmed;
  return SYSTEM_FIELDS[trimmed.toLowerCase().replace(/[\s_]/g, "")] ?? `System.${trimmed}`;
}

/** One JSON Patch operation, as Azure DevOps expects it. */
export interface PatchOperation {
  op: string;
  path: string;
  value?: unknown;
  from?: string;
}

/**
 * Turn `{title: "Fix login", state: "Active"}` into the JSON Patch document
 * `POST /workitems/${type}` and `PATCH /workitems/{id}` require.
 *
 * Work items are the only part of this API that takes a patch document rather
 * than an object, and it is `application/json-patch+json` rather than plain
 * JSON — sending an object is rejected in a way that does not mention either.
 */
export function fieldsToPatch(fields: Record<string, unknown>): PatchOperation[] {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([name, value]) => ({
      op: "add",
      path: `/fields/${qualifyField(name)}`,
      value,
    }));
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization — the runtime
 * routes every request through the auth `sign` hook.
 */
export class AzureDevOpsClient {
  readonly organization: string;

  constructor(private ctx: HookContext) {
    this.organization = organizationFromConnection(ctx.connection);
  }

  /**
   * Build a path under this connection's organization.
   *
   * `$` is deliberately left unencoded. Work item creation posts to
   * `_apis/wit/workitems/$Bug` — the dollar is part of the route, not a
   * variable — and `%24Bug` is a different path that does not exist. It is a
   * legal path character (RFC 3986 sub-delims), so leaving it is correct as
   * well as necessary.
   */
  path(...segments: Array<string | undefined>): string {
    const encode = (segment: string) =>
      segment.split("/").map((part) => encodeURIComponent(part).replace(/%24/g, "$")).join("/");
    const parts = segments.filter((s) => s !== undefined && s !== "").map((s) => encode(String(s)));
    return `/${encodeURIComponent(this.organization)}/${parts.join("/")}`;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    // Required on every request, not a default.
    url.searchParams.set("api-version", API_VERSION);

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
      // A bad credential answers 302 to a sign-in page. Following it would
      // turn an auth failure into a 200 of HTML.
      redirect: "manual",
    };
    if (options.body !== undefined) {
      headers["content-type"] = options.contentType ?? "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);

    // The whole reason for `redirect: "manual"`.
    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      throw new Error(
        `Azure DevOps ${res.status} for ${init.method} ${url.pathname}: redirected to a sign-in ` +
          "page, which is how it reports a rejected credential. Check the personal access token " +
          "— an expired or revoked one produces exactly this",
      );
    }

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(
        `Azure DevOps ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }
    if (res.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** A `{count, value}` collection, unwrapped. */
  async list<T = unknown>(path: string, options: RequestOptions = {}): Promise<T[]> {
    const body = await this.request<{ value?: T[] }>(path, options);
    return Array.isArray(body?.value) ? body.value : [];
  }
}

/**
 * Turn an Azure DevOps error into something actionable.
 *
 * Errors arrive as `{"$id", "innerException", "message", "typeName",
 * "typeKey", "errorCode", "eventId"}`. `message` is written for a person;
 * `typeKey` is the machine-readable half and is worth keeping because the
 * message alone is often ambiguous between two very different causes.
 */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as {
      message?: string;
      typeKey?: string;
      errorCode?: number;
    };
    detail = body?.message ?? detail;
    if (body?.typeKey) detail = `${detail} (${body.typeKey})`;
  } catch {
    // Azure DevOps answers some failures with an HTML page.
    if (/^\s*</.test(text)) {
      detail = "an HTML page rather than JSON, which usually means a " +
        "sign-in redirect was followed";
    }
  }

  if (status === 401 || status === 403) {
    return `${detail} — check the token's SCOPES. Azure DevOps personal access tokens are scoped ` +
      "per area (Code, Build, Work Items), and a token without the right scope authenticates " +
      "and is refused per endpoint";
  }
  if (status === 404) {
    return `${detail} — note that Azure DevOps answers 404 for a resource the token cannot see, ` +
      "not only for one that does not exist, so a missing scope can look like a missing project";
  }
  return detail || `${status}`;
}
