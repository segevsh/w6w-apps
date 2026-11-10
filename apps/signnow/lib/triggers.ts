import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { SignNowClient } from "./client.ts";

/**
 * SignNow webhook triggers (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` reads the connected user's id (`GET /user`) and registers the callback URL
 *     for one user-level event with `POST /v2/event-subscriptions`
 *     (`{ event, entity_id, attributes: { callback, secret_key } }`, answered 201
 *     `{ data: { id } }`). SignNow accepts a caller-chosen `secret_key` (up to 300 chars), so the
 *     host mints one with `randomSecret()` (D5 (1)) and keeps it in the subscription `state`.
 *   - `onUnsubscribe` deletes it with `DELETE /v2/event-subscriptions/{id}`; a subscription
 *     SignNow no longer has (404) counts as deleted.
 *   - `handleIngest` verifies `X-SignNow-Signature` (hex HMAC-SHA256 of the RAW callback body
 *     under the secret key) BEFORE it parses the body, then keeps only the event this trigger is
 *     for.
 *
 * Trust model: the signature binds the whole body but there is no timestamp in the signature
 * scheme, so a captured delivery can be replayed unchanged (SignNow itself resends callbacks on
 * failure, over a long window, so a freshness window would reject honest retries). The body's
 * `meta.timestamp` plus event and entity id is SignNow's own suggested de-dupe key.
 *
 * Docs (verified 2026-11-10): https://docs.signnow.com/docs/signnow/webhooks (events list, HMAC
 * security) and https://docs.signnow.com/docs/manage-event-subscriptions/operations/create-event-subscription-2.md
 * and .../delete-v2-event-subscriptions-subscription-id.md
 */

export interface TriggerState {
  /** The SignNow event subscription id. */
  subscriptionId: string;
  /** The HMAC secret key the host chose and registered. */
  secret: string;
}

/** The run's `trigger.event`: one SignNow callback. */
export interface SignNowEvent {
  event: string;
  timestamp: number | null;
  documentId: string | null;
  documentName: string | null;
  userId: string | null;
  initiatorId: string | null;
  content: Record<string, unknown>;
}

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event (e.g. user.document.complete)" },
  { key: "timestamp", type: "number", label: "Timestamp (epoch seconds)" },
  { key: "documentId", type: "string", label: "Document ID" },
  { key: "documentName", type: "string", label: "Document name" },
  { key: "userId", type: "string", label: "User ID" },
  { key: "initiatorId", type: "string", label: "Initiator ID" },
  { key: "content", type: "object", label: "Full event content" },
];

function sampleFor(event: string): SignNowEvent {
  return {
    event,
    timestamp: 1762770000,
    documentId: "sample-document-id",
    documentName: "Sales Agreement",
    userId: "sample-user-id",
    initiatorId: "sample-user-id",
    content: {
      document_id: "sample-document-id",
      document_name: "Sales Agreement",
      user_id: "sample-user-id",
    },
  };
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such subscription" answer `SignNowClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^SignNow 404\b/.test(err.message);
}

/**
 * Verify the delivery's signature and return the RAW body it covers. Throws (never echoing the
 * secret, the signature or the body) unless it verifies; an unset secret is refused before any
 * compare.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const received = header(raw, "x-signnow-signature");
  if (!received) {
    throw new Error("SignNow delivery refused: the X-SignNow-Signature header is missing.");
  }
  const expected = await hmac("SHA-256", key, body, "hex");
  if (!timingSafeEqual(expected, received.trim().toLowerCase())) {
    throw new Error("SignNow delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified delivery body → its normalized event. */
export function normalizeDelivery(body: string): SignNowEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Not a SignNow callback: the body is not JSON.");
  }
  const d = asObject(parsed);
  const meta = asObject(d?.meta);
  const event = str(meta?.event);
  if (!d || !event) throw new Error("Not a SignNow callback: expected meta.event.");
  const content = asObject(d.content) ?? {};
  const ts = Number(meta?.timestamp);
  return {
    event,
    timestamp: Number.isFinite(ts) ? ts : null,
    documentId: str(content.document_id),
    documentName: str(content.document_name),
    userId: str(content.user_id),
    initiatorId: str(meta?.initiator_id),
    content,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The SignNow user-level event name, e.g. `user.document.complete`. */
  event: string;
}

/** Build one SignNow event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, SignNowEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: OUTPUT,
    sample: sampleFor(spec.event),

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      const client = new SignNowClient(ctx);
      const me = await client.request<{ id?: string }>("/user");
      if (!me?.id) throw new Error("SignNow returned no user id for the connected account.");
      const secret = randomSecret();
      const made = await client.request<{ data?: { id?: string } }>("/v2/event-subscriptions", {
        method: "POST",
        body: {
          event: spec.event,
          entity_id: me.id,
          attributes: { callback: callbackUrl, secret_key: secret },
        },
      });
      const subscriptionId = made?.data?.id;
      if (!subscriptionId) throw new Error("SignNow created the subscription but returned no id.");
      return { subscriptionId, secret };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.subscriptionId) return;
      try {
        await new SignNowClient(ctx).request(
          `/v2/event-subscriptions/${encodeURIComponent(s.subscriptionId)}`,
          { method: "DELETE" },
        );
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`SignNow delivers callbacks with POST, not ${raw.method}.`);
      }
      const body = await verifySignature(raw, state?.secret);
      const event = normalizeDelivery(body);
      return event.event === spec.event ? [event] : [];
    },
  };
}
