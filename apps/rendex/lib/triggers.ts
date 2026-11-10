import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { encodeId, RendexClient } from "./client.ts";

/**
 * Rendex Watch webhook trigger (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` points the watch's single alert channel at the callback URL:
 *     `PATCH /v1/watches/{id}` with `{ webhookUrl }`. A watch has ONE `webhookUrl`, so subscribing
 *     replaces whatever URL the watch had (and needs a plan that includes webhooks).
 *   - `onUnsubscribe` switches the channel off again with `PATCH /v1/watches/{id}`
 *     `{ webhookUrl: null }` (the documented way to clear it); a watch Rendex no longer has
 *     (404) counts as done.
 *   - `handleIngest` verifies `x-rendex-signature` (hex HMAC-SHA256 of `"<x-rendex-timestamp>.
 *     <raw body>"`, Stripe-style) under the signing secret, rejects a timestamp more than five
 *     minutes from now, BEFORE it parses the body, then keeps only the chosen watch events.
 *
 * Only the `watch.*` events are an account event stream. `job.completed`, `job.failed` and
 * `batch.completed` (same channel, same signature) only report a job the caller started with a
 * `webhookUrl`; they are not wired, and one arriving here is acknowledged and dropped.
 *
 * Trust model: Rendex signs with ONE secret for the whole deployment (`WEBHOOK_SIGNING_SECRET`,
 * obtained from Rendex support, not minted per watch), so the user pastes it as `signingSecret`.
 *
 * Docs (verified 2026-11-10): https://rendex.dev/docs/webhooks, https://rendex.dev/docs/watch
 * and https://rendex.dev/docs/api-reference
 */

export interface TriggerParams {
  watchId: string;
  events?: string;
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  watchId: string;
}

/** The run's `trigger.event`: one Rendex Watch alert. */
export interface RendexWatchEvent {
  event: string;
  status: string | null;
  watchId: string | null;
  runId: string | null;
  url: string | null;
  changed: boolean | null;
  summary: string | null;
  diffScore: number | null;
  diffPixels: number | null;
  textDiff: unknown;
  beforeUrl: string | null;
  afterUrl: string | null;
  diffOverlayUrl: string | null;
  cropUrl: string | null;
  changedRegion: unknown;
  error: string | null;
  completedAt: string | null;
  deliveryId: string | null;
}

/** Event name a user picks → the Rendex event it means. */
const EVENT_FOR: Record<string, string> = {
  changed: "watch.changed",
  recovered: "watch.recovered",
  error: "watch.error",
};
const DEFAULT_EVENTS = Object.keys(EVENT_FOR);

const PARAMS: Param[] = [
  {
    key: "watchId",
    label: "Watch ID",
    type: "string",
    required: true,
    hint:
      "The Rendex Watch to listen to (Create Watch / List Watches return the id). Its webhook URL is replaced.",
  },
  {
    key: "events",
    label: "Events",
    type: "string",
    advanced: true,
    hint: `Comma-separated: ${DEFAULT_EVENTS.join(", ")}. Leave empty for all of them.`,
  },
  {
    key: "signingSecret",
    label: "Webhook signing secret",
    type: "secret",
    required: true,
    hint:
      "Rendex's webhook signing secret (WEBHOOK_SIGNING_SECRET; Rendex support issues and rotates it). Every delivery is verified with it; one that does not verify is refused.",
  },
];

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event (watch.changed, watch.recovered, watch.error)" },
  { key: "status", type: "string", label: "Status" },
  { key: "watchId", type: "string", label: "Watch ID" },
  { key: "runId", type: "string", label: "Run ID" },
  { key: "url", type: "string", label: "Watched URL" },
  { key: "changed", type: "boolean", label: "Changed" },
  { key: "summary", type: "string", label: "One-line summary of the change" },
  { key: "diffScore", type: "number", label: "Diff score (0..1)" },
  { key: "diffPixels", type: "number", label: "Diff pixels" },
  { key: "textDiff", type: "object", label: "Text diff (added / removed lines)" },
  { key: "beforeUrl", type: "string", label: "Before image (short-lived link)" },
  { key: "afterUrl", type: "string", label: "After image (short-lived link)" },
  { key: "diffOverlayUrl", type: "string", label: "Diff overlay image (short-lived link)" },
  { key: "cropUrl", type: "string", label: "Crop of the change (short-lived link)" },
  { key: "changedRegion", type: "object", label: "Changed region (normalized 0..1)" },
  { key: "error", type: "string", label: "Error (watch.error)" },
  { key: "completedAt", type: "string", label: "Completed at" },
  { key: "deliveryId", type: "string", label: "Delivery ID (same across retries)" },
];

const SAMPLE: RendexWatchEvent = {
  event: "watch.changed",
  status: "changed",
  watchId: "b1de4f2a-9abc-4def-8901-2a3b4c5d6e7f",
  runId: "c2ef5a3b-0d1e-4a2b-9c3d-4e5f6a7b8c9d",
  url: "https://example.com/pricing",
  changed: true,
  summary: "A new enterprise tier was added to the pricing table.",
  diffScore: 0.0412,
  diffPixels: 18240,
  textDiff: { added: ["New enterprise tier"], removed: [] },
  beforeUrl: "https://api.rendex.dev/v1/images/before",
  afterUrl: "https://api.rendex.dev/v1/images/after",
  diffOverlayUrl: "https://api.rendex.dev/v1/images/overlay",
  cropUrl: "https://api.rendex.dev/v1/images/crop",
  changedRegion: { x: 0.08, y: 0.42, width: 0.5, height: 0.12 },
  error: null,
  completedAt: "2026-11-10T12:00:00Z",
  deliveryId: "sample-delivery-id",
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** True for the "no such watch" answer `RendexClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Rendex 404\b/.test(err.message);
}

/** The user's event list (default all) → validated Rendex event names. */
export function chooseEvents(raw: string | undefined): string[] {
  const wanted = (raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const names = wanted.length > 0 ? wanted : DEFAULT_EVENTS;
  const bad = names.filter((e) => !(e in EVENT_FOR));
  if (bad.length > 0) {
    throw new Error(
      `Unknown Rendex watch event(s): ${bad.join(", ")}. Use ${DEFAULT_EVENTS.join(", ")}.`,
    );
  }
  return [...new Set(names.map((e) => EVENT_FOR[e]))];
}

/**
 * Verify the delivery's signature and clock, and return the RAW body it covers. Throws (never
 * echoing the secret, the signature or the body) unless it verifies; an unset secret is refused
 * before any compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const signature = header(raw, "x-rendex-signature");
  const timestamp = header(raw, "x-rendex-timestamp");
  if (!signature || !timestamp) {
    throw new Error(
      "Rendex delivery refused: the x-rendex-signature or x-rendex-timestamp header is missing.",
    );
  }
  if (!/^\d+$/.test(timestamp.trim()) || !withinTolerance(Number(timestamp), nowMs)) {
    throw new Error("Rendex delivery refused: the timestamp is outside the allowed window.");
  }
  const expected = await hmac("SHA-256", key, `${timestamp.trim()}.${body}`, "hex");
  if (!timingSafeEqual(expected, signature.trim().toLowerCase())) {
    throw new Error("Rendex delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified delivery → its normalized event. */
export function normalizeDelivery(
  body: string,
  headers: Record<string, string>,
): RendexWatchEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Not a Rendex webhook delivery: the body is not JSON.");
  }
  const d = asObject(parsed);
  const event = str(d?.event);
  if (!d || !event) throw new Error("Not a Rendex webhook delivery: expected an event.");
  return {
    event,
    status: str(d.status),
    watchId: str(d.watchId),
    runId: str(d.runId),
    url: str(d.url),
    changed: typeof d.changed === "boolean" ? d.changed : null,
    summary: str(d.summary),
    diffScore: num(d.diffScore),
    diffPixels: num(d.diffPixels),
    textDiff: d.textDiff ?? null,
    beforeUrl: str(d.beforeUrl),
    afterUrl: str(d.afterUrl),
    diffOverlayUrl: str(d.diffOverlayUrl),
    cropUrl: str(d.cropUrl),
    changedRegion: d.changedRegion ?? null,
    error: str(d.error),
    completedAt: str(d.completedAt),
    deliveryId: str(header({ headers }, "x-rendex-delivery-id")),
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
}

/** Build the Rendex Watch alert webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, RendexWatchEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: PARAMS,
    output: OUTPUT,
    sample: SAMPLE,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const watchId = encodeId(params?.watchId ?? "");
      if (!watchId) throw new Error("Choose the Rendex Watch to listen to.");
      chooseEvents(params?.events);
      await new RendexClient(ctx).json(`/watches/${watchId}`, {
        method: "PATCH",
        body: { webhookUrl: callbackUrl },
      });
      return { watchId: String(params.watchId).trim() };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.watchId) return;
      try {
        await new RendexClient(ctx).json(`/watches/${encodeId(s.watchId)}`, {
          method: "PATCH",
          body: { webhookUrl: null },
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Rendex delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, params?.signingSecret);
      const event = normalizeDelivery(body, raw.headers);
      return chooseEvents(params?.events).includes(event.event) ? [event] : [];
    },
  };
}
