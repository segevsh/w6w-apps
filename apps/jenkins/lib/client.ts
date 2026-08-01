import type { HookContext } from "@w6w/types";

/**
 * Inlined base64 encoder — the app sandbox has `import: false`, so hooks can't
 * pull from jsr:@std/encoding at runtime. Same output as @std/encoding's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe swaps.
 */
export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * Jenkins is almost always self-hosted — a customer's own CI box, an on-prem
 * network segment, or a managed-Jenkins offering — each addressed by its own
 * URL. There is no fixed API host this app can allowlist, so the instance's
 * own base URL is collected as an `endpoint` Connection field and every
 * request is built from it.
 *
 * NOTE: The App manifest sets `network.allow: ["*"]` for exactly this reason
 * — same pattern as `elastic` and `wordpress` for arbitrary self-hosted
 * installs.
 */
export interface JenkinsConnectionDisplay {
  /** Base URL of the Jenkins instance, e.g. `https://ci.example.com`. */
  endpoint?: string;
}

/** Resolve the instance base URL from public connection metadata. */
export function resolveBaseUrl(display: JenkinsConnectionDisplay | undefined): string {
  if (!display?.endpoint) {
    throw new Error("Jenkins connection is missing endpoint");
  }
  return display.endpoint.replace(/\/+$/, "");
}

/**
 * Jenkins addresses a job by nesting `job/<name>` segments once per folder
 * level (the Folders plugin, and Jenkins' own multibranch pipelines, are
 * addressed this way — `job/my-folder/job/my-pipeline/...`). Accepting a
 * single `/`-delimited job name (`"my-folder/my-pipeline"`) and expanding it
 * here means callers never have to hand-build the `job/…/job/…` path
 * themselves, while a plain top-level job (`"my-job"`) still works unchanged.
 */
export function jobPath(job: string): string {
  const segments = job.split("/").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error("job name must not be empty");
  }
  return segments.map((s) => `job/${encodeURIComponent(s)}`).join("/");
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

function applyQuery(url: URL, query?: QueryParams): void {
  if (!query) return;
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}

export interface PostResult {
  status: number;
  /**
   * The `Location` response header, present on a successful build trigger
   * (`.../job/<name>/build[WithParameters]`) pointing at the newly created
   * queue item, e.g. `https://ci.example.com/queue/item/1543/`.
   */
  location: string | null;
}

/**
 * Thin wrapper over `ctx.fetch`. Authorization is injected upstream by the
 * `basic` auth method's `sign` hook — we never touch it here.
 */
export class JenkinsClient {
  constructor(private ctx: HookContext, private baseUrl: string) {}

  static fromConnection(ctx: HookContext): JenkinsClient {
    const display = (ctx.connection?.display ?? {}) as JenkinsConnectionDisplay;
    return new JenkinsClient(ctx, resolveBaseUrl(display));
  }

  /** GET a `.../api/json` endpoint and parse the JSON body. */
  async getJson<T = unknown>(path: string, query?: QueryParams): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    applyQuery(url, query);
    const res = await this.ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(`Jenkins ${res.status} ${res.statusText} for GET ${url.pathname}: ${detail}`);
    }
    const text = await res.text();
    return (text.length ? JSON.parse(text) : undefined) as T;
  }

  /**
   * POST a control endpoint (build trigger, stop, …). Jenkins' responses to
   * these carry no useful JSON body — a trigger's payload is the `Location`
   * header, not the response body — so this returns status + `Location`
   * rather than trying to parse one.
   *
   * `form`, when given, is sent `application/x-www-form-urlencoded` — the
   * encoding `buildWithParameters` expects for build parameters.
   */
  async post(
    path: string,
    options: { query?: QueryParams; form?: QueryParams } = {},
  ): Promise<PostResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    applyQuery(url, options.query);

    const init: RequestInit = { method: "POST", headers: {} };
    if (options.form) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(options.form)) {
        if (v === undefined || v === null || v === "") continue;
        body.set(k, String(v));
      }
      init.body = body.toString();
      (init.headers as Record<string, string>)["content-type"] =
        "application/x-www-form-urlencoded";
    }

    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch { /* ignore */ }
      throw new Error(
        `Jenkins ${res.status} ${res.statusText} for POST ${url.pathname}: ${detail}`,
      );
    }
    return { status: res.status, location: res.headers.get("location") };
  }
}

/**
 * Extract the numeric queue item id from a build trigger's `Location`
 * header (`https://ci.example.com/queue/item/1543/` → `1543`).
 */
export function parseQueueId(location: string | null): number | undefined {
  if (!location) return undefined;
  const match = location.match(/\/queue\/item\/(\d+)\/?$/);
  return match ? Number(match[1]) : undefined;
}
