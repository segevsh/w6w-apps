import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Mailgun runs two entirely separate regions on different hosts —
 * `api.mailgun.net` (US) and `api.eu.mailgun.net` (EU) — and a domain created
 * in one region is only ever reachable on that region's host. The region is
 * collected once at connect time (an auth field, not a per-action param) and
 * echoed onto the connection's `display` by `afterConnect`, exactly like
 * Zendesk's subdomain: actions never see the credential, so this is the only
 * way for them to learn which host to call.
 */
export type MailgunRegion = "us" | "eu";

export function apiHost(region: MailgunRegion): string {
  return region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
}

export function regionFromConnection(connection: RedactedConnection | undefined): MailgunRegion {
  const display = (connection?.display ?? {}) as { region?: string };
  return display.region === "eu" ? "eu" : "us";
}

/** `https://api.mailgun.net` or `https://api.eu.mailgun.net`, no path suffix. */
export function baseUrl(connection: RedactedConnection | undefined): string {
  return `https://${apiHost(regionFromConnection(connection))}`;
}

/** Drop keys the caller left unset so a request doesn't send empty fields Mailgun would reject. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Mailgun error bodies are `{ "message": "..." }` (most endpoints) or
 * `{ "Error": "..." }` (a few legacy ones) — check both.
 */
async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { message?: string; Error?: string };
    return body.message ?? body.Error ?? text;
  } catch {
    return text;
  }
}

export interface QueryValue {
  [key: string]: string | number | boolean | undefined | null | Array<string | number>;
}

/** Repeated keys (`event=a&event=b`) are how Mailgun's list/stats endpoints take multi-value filters. */
function applyQuery(url: URL, query?: QueryValue): void {
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, String(item));
    } else {
      url.searchParams.set(k, String(v));
    }
  }
}

/**
 * Thin wrapper over `ctx.fetch`. Never sets Authorization — the runtime routes
 * every request through the auth `sign` hook, which stamps HTTP Basic
 * `api:<apiKey>` onto the request.
 */
export class MailgunClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(ctx.connection);
  }

  /** JSON GET/DELETE. */
  async request<T = unknown>(
    path: string,
    options: { method?: string; query?: QueryValue } = {},
  ): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    applyQuery(url, options.query);

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(
        `Mailgun ${res.status} ${res.statusText} for ${
          options.method ?? "GET"
        } ${url.pathname}: ${await readError(
          res,
        )}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** `application/x-www-form-urlencoded` POST/PUT — most Mailgun write endpoints. */
  async postForm<T = unknown>(
    path: string,
    fields: Record<string, unknown>,
    method = "POST",
  ): Promise<T> {
    const url = `${this.base}${path}`;
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) body.append(k, String(item));
      } else {
        body.append(k, String(v));
      }
    }

    const res = await this.ctx.fetch(url, {
      method,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(
        `Mailgun ${res.status} ${res.statusText} for ${method} ${path}: ${await readError(res)}`,
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}

// `multipart/form-data` (only `message-send` needs it, for file attachments) is built
// and posted directly in that action via `ctx.fetch` + `baseUrl()` — see actions/message-send.ts.
