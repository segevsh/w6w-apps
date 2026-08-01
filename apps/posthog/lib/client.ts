import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * PostHog runs two independent regional clouds — US and EU — each with two
 * separate hosts:
 *
 *   - the **app/query REST API** (`us.posthog.com` / `eu.posthog.com`), signed
 *     with a Personal API Key as `Authorization: Bearer <key>`, scoped to a
 *     project via `/api/projects/{project_id}/...`; and
 *   - the **ingestion/capture API** (`us.i.posthog.com` / `eu.i.posthog.com`),
 *     which needs no Authorization header at all — the (intentionally public)
 *     Project API Key travels in the request body as `api_key`.
 *
 * Verified live 2026-08-01 against https://posthog.com/docs/api and
 * https://posthog.com/docs/api/capture: the capture docs state requests must
 * go to `us.i.posthog.com` / `eu.i.posthog.com`, distinct from the app host —
 * `us.posthog.com` does NOT serve `/i/v0/e/`. See `actions/capture-event.ts`
 * for why the Project API Key is a per-action param rather than an Auth field.
 *
 * The region is collected once at connect time (an auth field, not a
 * per-action param) and echoed onto the connection's `display` by
 * `afterConnect`, exactly like Mailgun's and Zendesk's region/subdomain
 * pattern in this pack — actions never see the credential, so this is the
 * only way for them to learn which host to call. `projectId` travels the same
 * way: it is not secret, but it is collected alongside the credential, so it
 * is echoed onto `display` too rather than re-asked per action.
 */
export type PostHogRegion = "us" | "eu";

export function appHost(region: PostHogRegion): string {
  return region === "eu" ? "eu.posthog.com" : "us.posthog.com";
}

export function ingestionHost(region: PostHogRegion): string {
  return region === "eu" ? "eu.i.posthog.com" : "us.i.posthog.com";
}

export function regionFromConnection(connection: RedactedConnection | undefined): PostHogRegion {
  const display = (connection?.display ?? {}) as { region?: string };
  return display.region === "eu" ? "eu" : "us";
}

export function projectIdFromConnection(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { projectId?: string };
  return display.projectId ?? "";
}

/** `https://us.posthog.com` or `https://eu.posthog.com`, no path suffix. */
export function baseUrl(connection: RedactedConnection | undefined): string {
  return `https://${appHost(regionFromConnection(connection))}`;
}

/** `/api/projects/{project_id}{suffix}` — pass to `PostHogClient.request`. */
export function projectPath(connection: RedactedConnection | undefined, suffix: string): string {
  const projectId = projectIdFromConnection(connection);
  if (!projectId) throw new Error("connection is missing a projectId");
  return `/api/projects/${encodeURIComponent(projectId)}${suffix}`;
}

/** Drop keys the caller left unset so a request doesn't send empty query params. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

function applyQuery(url: URL, query?: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
}

/**
 * PostHog's DRF error responses vary by endpoint — some carry `{"detail": "..."}`,
 * others `{"error": "..."}` or `{"type", "code", "detail", "attr"}` — so this
 * checks the common keys before falling back to the raw body.
 */
async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { detail?: string; error?: string; message?: string };
    return body.detail ?? body.error ?? body.message ?? text;
  } catch {
    return text;
  }
}

/**
 * Thin wrapper over `ctx.fetch` for the app/query REST API. Never sets
 * Authorization — the runtime routes every request through the auth `sign`
 * hook, which stamps `Bearer <personalApiKey>` onto the request.
 */
export class PostHogClient {
  private base: string;

  constructor(private ctx: HookContext) {
    this.base = baseUrl(ctx.connection);
  }

  async request<T = unknown>(
    path: string,
    options: { method?: string; query?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    applyQuery(url, options.query);

    const res = await this.ctx.fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
      throw new Error(
        `PostHog ${res.status} ${res.statusText} for ${
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
}
