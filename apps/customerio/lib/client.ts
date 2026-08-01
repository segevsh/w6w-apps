import type { HookContext, RedactedConnection } from "@w6w/types";

/**
 * Customer.io's write-side **Track API** — identify/delete a person, track an
 * event, add/remove a person to/from a manual segment, and merge two person
 * profiles. Authenticated with HTTP Basic: the workspace's **Site ID** as the
 * username and its **Track API Key** as the password.
 *
 * This is deliberately a different host and a different credential from
 * Customer.io's **App API** (`api.customer.io` / `api-eu.customer.io`,
 * Bearer token) — this app does not call that API; see the README.
 *
 * Customer.io runs two entirely separate data regions on two different hosts,
 * and a workspace created in one region only ever answers on that region's
 * host — there is no cross-region fallback. Verified 2026-08-01 against the
 * official `customerio-node` SDK (`customerio/customerio-node`,
 * `lib/regions.ts` and `lib/track.ts` — every Track endpoint is built from
 * `region.trackUrl`, which is `https://track.customer.io/api/v1` for US and
 * `https://track-eu.customer.io/api/v1` for EU) and cross-checked against
 * n8n's `CustomerIoApi.credentials.ts` / `GenericFunctions.ts`, which build
 * the identical Basic header and host selection.
 */
export type Region = "us" | "eu";

const TRACK_HOST: Record<Region, string> = {
  us: "track.customer.io",
  eu: "track-eu.customer.io",
};

/**
 * The region is collected once at connect time (an auth field, not a
 * per-action param) and echoed onto the connection's redacted `display` by
 * `afterConnect` — the same pattern Zendesk's subdomain and Mailgun's region
 * use. Actions never see the credential, so this is the only way for them to
 * learn which host to call.
 */
export function regionFromConnection(connection: RedactedConnection | undefined): Region {
  const display = (connection?.display ?? {}) as { region?: string };
  return display.region === "eu" ? "eu" : "us";
}

/** `https://track.customer.io/api/v1` or `https://track-eu.customer.io/api/v1`. */
export function trackBase(region: Region): string {
  return `https://${TRACK_HOST[region]}/api/v1`;
}

/**
 * A `type: "json"` param arrives already parsed as an object in the reference
 * runtime, but some hosts pass it through as a raw JSON string — accept both.
 */
export function parseJsonParam(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null) throw new Error("expected a JSON object");
    return parsed as Record<string, unknown>;
  }
  throw new Error("expected a JSON object");
}

/** Drop keys the caller left unset so a request doesn't send empty/null fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Customer.io error bodies are `{ "meta": { "error": "..." } }` or
 * `{ "meta": { "errors": ["...", ...] } }` (confirmed against
 * `customerio-node`'s `CustomerIORequestError.composeMessage`, which reads
 * exactly those two shapes off the parsed body). Fall back to the raw text
 * when the body matches neither.
 */
async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { meta?: { error?: string; errors?: string[] } };
    if (body.meta?.error) return body.meta.error;
    if (body.meta?.errors?.length) return body.meta.errors.join("; ");
    return text;
  } catch {
    return text;
  }
}

/**
 * One Track API call. Customer.io returns `200` with an empty (or near-empty)
 * JSON body for every well-formed, authenticated request — no response body
 * shape is documented for these write endpoints, so this reports success from
 * the status code alone rather than inventing one.
 */
export async function request(
  ctx: HookContext,
  region: Region,
  method: "PUT" | "DELETE" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<{ success: boolean }> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await ctx.fetch(`${trackBase(region)}${path}`, init);
  if (!res.ok) {
    throw new Error(
      `Customer.io ${res.status} ${res.statusText} for ${method} ${path}: ${await readError(res)}`,
    );
  }
  return { success: true };
}
