import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { HeyGenClient } from "./client.ts";

/**
 * HeyGen webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL with `POST /v3/webhooks/endpoints` for the one event
 *     type the trigger fires on. HeyGen answers with the endpoint's signing secret ONCE (it is
 *     `null` in every later read), so the secret is kept in the subscription `state` (D5 (1)-style:
 *     vendor-issued, host-stored). An answer without an endpoint id and a secret is unusable (no
 *     delivery could ever verify), so the endpoint is removed again and the subscribe fails.
 *   - `onUnsubscribe` deletes the endpoint with `DELETE /v3/webhooks/endpoints/{id}`; one HeyGen no
 *     longer has (404) counts as deleted.
 *   - `handleIngest` verifies the `signature` header (hex HMAC-SHA256 of the exact request body
 *     under the endpoint secret) BEFORE it parses anything. HeyGen documents no timestamp in the
 *     scheme and retries failed deliveries for 24 h, so there is no freshness window; de-duplicate
 *     on `eventType` + `videoId` (or the `callback_id` you set).
 *
 * Docs (verified 2026-11-10): https://developers.heygen.com/docs/webhooks and
 * https://developers.heygen.com/docs/webhook-events
 */

export interface TriggerParams {
  // No params: the secret is vendor-issued at subscribe time and lives in the state.
  [key: string]: unknown;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  endpointId: string;
  /** The endpoint signing secret HeyGen returned once at creation. */
  secret: string;
}

/** The run's `trigger.event`: one HeyGen webhook delivery. */
export interface HeyGenEvent {
  eventType: string;
  eventId: string | null;
  createdAt: string | null;
  videoId: string | null;
  videoUrl: string | null;
  videoPageUrl: string | null;
  callbackId: string | null;
  data: Record<string, unknown>;
}

export const OUTPUT: OutputField[] = [
  { key: "eventType", type: "string", label: "Event type" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "createdAt", type: "string", label: "Created at (ISO 8601)" },
  { key: "videoId", type: "string", label: "Video ID" },
  { key: "videoUrl", type: "string", label: "Video download URL (pre-signed, expires)" },
  { key: "videoPageUrl", type: "string", label: "Video page URL in HeyGen" },
  { key: "callbackId", type: "string", label: "Callback ID you set when creating the video" },
  { key: "data", type: "object", label: "Full event data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such endpoint" answer `HeyGenClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^HeyGen 404\b/.test(err.message);
}

const ENDPOINTS = "/v3/webhooks/endpoints";

/**
 * Check the `signature` header against the exact bytes received. Throws (never echoing the secret,
 * the signature or the header) unless it matches; an unset secret is refused before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "signature");
  if (given === undefined || given === "") {
    throw new Error("HeyGen delivery refused: the signature header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "hex");
  if (!timingSafeEqual(expected, given.trim().toLowerCase())) {
    throw new Error("HeyGen delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified delivery body → its event. Throws on a body that is not a HeyGen event. */
export function normalizeDelivery(body: unknown): HeyGenEvent {
  const n = asObject(body);
  const eventType = str(n?.event_type);
  if (!n || !eventType) throw new Error("Not a HeyGen webhook delivery: expected `event_type`.");
  const data = asObject(n.event_data) ?? {};
  return {
    eventType,
    eventId: str(n.event_id),
    createdAt: str(n.created_at),
    videoId: str(data.video_id),
    videoUrl: str(data.url),
    videoPageUrl: str(data.video_page_url),
    callbackId: str(data.callback_id),
    data,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The HeyGen event type this trigger registers for and fires on. */
  eventType: string;
  sample: HeyGenEvent;
}

/** Build one HeyGen event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, HeyGenEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      const client = new HeyGenClient(ctx);
      const created = await client.data<{ endpoint_id?: unknown; secret?: unknown }>(ENDPOINTS, {
        method: "POST",
        body: { url: callbackUrl, events: [spec.eventType] },
      });
      const endpointId = str(created?.endpoint_id);
      const secret = typeof created?.secret === "string" ? created.secret : "";
      if (!endpointId || secret === "") {
        if (endpointId) {
          try {
            await client.status(`${ENDPOINTS}/${encodeURIComponent(endpointId)}`, {
              method: "DELETE",
            });
          } catch { /* best-effort rollback */ }
        }
        throw new Error(
          "HeyGen did not return a webhook endpoint id and signing secret, so deliveries could not be verified.",
        );
      }
      return { endpointId, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.endpointId) return;
      try {
        await new HeyGenClient(ctx).status(`${ENDPOINTS}/${encodeURIComponent(s.endpointId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`HeyGen delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, (state as Partial<TriggerState> | undefined)?.secret);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("HeyGen delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed);
      // The endpoint is registered for this one event type; anything else is acknowledged, no run.
      if (event.eventType !== spec.eventType) return [];
      return [event];
    },
  };
}
