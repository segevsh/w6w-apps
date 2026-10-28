import type { HookContext } from "@w6w/types";

/**
 * Segment's write-side **Tracking API** — `identify` / `track` / `page` /
 * `group` / `alias` / `batch`. Authenticated with the source's Write Key as
 * the HTTP Basic username with an empty password (see `../auth/write-key.ts`).
 *
 * This is deliberately a different host and a different credential from
 * Segment's read-side config/management API (`api.segmentapis.com`, Bearer
 * token) — this app does not call that API; see the README.
 *
 * Verified 2026-08-01 against `segment.com/docs/connections/sources/catalog/libraries/server/http-api/`
 * (fetched via its Netlify-hosted mirror, `segment.com` itself returns 403 to
 * automated fetches) and cross-checked against n8n's `SegmentApi.credentials.ts`.
 */
export const TRACKING_BASE = "https://api.segment.io/v1";

/** Fields shared by every Tracking API call. See `../../rfcs` — this app's own reading of
 * https://segment.com/docs/connections/spec/common/. */
export interface CommonFields {
  context?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  timestamp?: string;
  messageId?: string;
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

/**
 * Every identify/track/page/group call needs a `userId` or an `anonymousId` —
 * Segment rejects a call with neither.
 * https://segment.com/docs/connections/spec/common/
 */
export function requireIdentity(userId: string | undefined, anonymousId: string | undefined): void {
  if (!userId && !anonymousId) {
    throw new Error("either `userId` or `anonymousId` is required");
  }
}

/**
 * Reads the fields shared by identify/track/page/group/alias off the action's
 * `input` (context, integrations, timestamp), plus a `messageId` derived from
 * the invocation id.
 *
 * Segment dedupes on `messageId` within a rolling window, so stamping the
 * invocation id here is what makes these `perform` actions honestly
 * `idempotent: true` — a host retry of the same invocation lands the same
 * `messageId` twice and Segment drops the duplicate, rather than double-firing
 * a trait update or an analytics event. See `../actions/*.ts` for the
 * per-action idempotency note.
 */
export function buildCommon(input: Record<string, unknown>, ctx: HookContext): CommonFields {
  const common: CommonFields = {};
  const context = parseJsonParam(input.context);
  if (context) common.context = context;
  const integrations = parseJsonParam(input.integrations);
  if (integrations) common.integrations = integrations;
  if (typeof input.timestamp === "string" && input.timestamp) common.timestamp = input.timestamp;
  if (ctx.invocation?.invocationId) common.messageId = ctx.invocation.invocationId;
  return common;
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
 * POST one Tracking API call. Segment returns `200` for every well-formed,
 * authenticated request (`400` for oversized payloads or invalid JSON, `401`
 * for a bad Write Key) — it does not synchronously validate that the event
 * was accepted downstream, so the return value here is honestly just
 * "the vendor took it", not "it was processed". No response body shape is
 * documented, so this reports success from the status code alone rather than
 * inventing a body schema.
 */
export async function post(
  ctx: HookContext,
  path: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean }> {
  const res = await ctx.fetch(`${TRACKING_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Segment ${res.status} ${res.statusText} for POST ${path}: ${text}`);
  }
  return { success: true };
}
