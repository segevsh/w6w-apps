import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { BrexClient, encodeId } from "./client.ts";

/**
 * Brex webhook trigger (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - Brex's webhook endpoints live under `/v1`, while `BrexClient` prefixes every path with `/v2`,
 *     so the paths below start with `/../v1`: the URL parser resolves `/v2/../v1/webhooks` to
 *     `/v1/webhooks` before the request leaves (the tests assert the resolved path).
 *   - `onSubscribe` registers the callback URL with `POST /v1/webhooks` (`url`, `event_types`; the
 *     required `Idempotency-Key` is derived from the subscription id), then reads the signing
 *     secrets with `GET /v1/webhooks/secrets` and keeps them in the subscription's state (D5: the
 *     vendor generates the secret). If the secrets cannot be read the webhook is deleted again.
 *     Brex allows ONE webhook endpoint per client, so a second subscription is refused by Brex.
 *   - `onUnsubscribe` deletes it with `DELETE /v1/webhooks/{id}`; one Brex no longer has (404)
 *     counts as deleted.
 *   - `handleIngest` verifies the Standard-Webhooks-style headers (`Webhook-Id`,
 *     `Webhook-Timestamp`, `Webhook-Signature`): base64 HMAC-SHA256 of `<id>.<timestamp>.<raw body>`
 *     under the base64-decoded secret, against ANY space-delimited `v1,<sig>` entry and ANY stored
 *     secret (Brex returns two during a rotation), within five minutes of now, BEFORE it parses
 *     anything.
 *
 * Trust model: the signature covers the id, timestamp and exact body, so a delivery cannot be
 * edited, only replayed inside the window (and Brex resends a failed delivery with the same
 * `Webhook-Id`, which the event carries for a workflow to dedupe on). Secrets are read once, at
 * subscribe time: after Brex rotates them, recreate the trigger.
 *
 * Docs (verified 2026-11-10): https://developer.brex.com/guides/webhooks and
 * https://developer.brex.com/openapi/webhooks_api
 */

export interface TriggerParams {
  eventTypes?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  /** Brex's signing secrets (`ACTIVE` and `PENDING_REVOKE`), as returned. */
  secrets: string[];
}

/** The run's `trigger.event`: one Brex webhook event. */
export interface BrexEvent {
  eventType: string;
  webhookId: string | null;
  timestamp: number | null;
  companyId: string | null;
  /** The whole delivery, exactly as Brex sent it. */
  data: Record<string, unknown>;
}

/** The event types a user can pick (the catalog in Brex's webhook guide plus two more documented). */
export const EVENT_TYPES = [
  "REFERRAL_CREATED",
  "REFERRAL_ACTIVATED",
  "REFERRAL_APPLICATION_STATUS_CHANGED",
  "TRANSFER_PROCESSED",
  "TRANSFER_FAILED",
  "USER_UPDATED",
  "EXPENSE_PAYMENT_UPDATED",
  "ACCOUNTING_RECORD_READY_FOR_EXPORT",
];

const EVENT_TYPES_PARAM: Param = {
  key: "eventTypes",
  label: "Event Types",
  type: "string",
  advanced: true,
  hint: `Comma-separated Brex event types to fire on: ${
    EVENT_TYPES.join(", ")
  }. Leave empty for all of them.`,
};

const OUTPUT: OutputField[] = [
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "webhookId", type: "string", label: "Webhook ID (stable across resends)" },
  { key: "timestamp", type: "number", label: "Delivery Timestamp (epoch seconds)" },
  { key: "companyId", type: "string", label: "Company ID" },
  { key: "data", type: "object", label: "Event Data" },
];

const SAMPLE: BrexEvent = {
  eventType: "TRANSFER_PROCESSED",
  webhookId: "msg_sample0001",
  timestamp: 1762766100,
  companyId: "cuacc_sample0001",
  data: {
    event_type: "TRANSFER_PROCESSED",
    transfer_id: "dptx_sample0001",
    company_id: "cuacc_sample0001",
  },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such webhook" answer `BrexClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Brex 404\b/.test(err.message);
}

/** `/v1/...` through a client that prefixes `/v2` (see the file header). */
const v1 = (path: string) => `/../v1${path}`;

/** The user's event list (default all) → validated names. */
export function chooseEventTypes(raw: string | undefined): string[] {
  const wanted = (raw ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (wanted.length === 0) return [...EVENT_TYPES];
  const bad = wanted.filter((e) => !EVENT_TYPES.includes(e));
  if (bad.length > 0) {
    throw new Error(
      `Unknown Brex event type(s): ${bad.join(", ")}. Use ${EVENT_TYPES.join(", ")}.`,
    );
  }
  return [...new Set(wanted)];
}

/** Standard or URL-safe base64 → bytes; null when it does not decode to anything. */
function base64Bytes(s: string): Uint8Array | null {
  try {
    const std = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    const bin = atob(std + "=".repeat((4 - (std.length % 4)) % 4));
    if (bin.length === 0) return null;
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * The HMAC keys one stored secret can stand for. Brex's guide base64-decodes the secret string as
 * returned; its OpenAPI example writes a secret with a `whsec_` prefix, which the Standard
 * Webhooks convention strips first, so both readings are tried (they key the same secret).
 */
function keysFor(secret: string): Uint8Array[] {
  const out: Uint8Array[] = [];
  const whole = base64Bytes(secret);
  if (whole) out.push(whole);
  if (secret.startsWith("whsec_")) {
    const stripped = base64Bytes(secret.slice("whsec_".length));
    if (stripped) out.push(stripped);
  }
  return out;
}

/** `v1,<sig> v1,<sig> v2,<sig>` → the `v1` signatures. */
function v1Signatures(given: string): string[] {
  return given.split(" ").filter(Boolean).flatMap((entry) => {
    const i = entry.indexOf(",");
    return i > 0 && entry.slice(0, i) === "v1" ? [entry.slice(i + 1)] : [];
  });
}

/**
 * Verify the delivery's headers against the stored secrets and the clock. Returns the raw body and
 * the delivery id and timestamp. Throws (never echoing a secret, signature, header or the body)
 * unless it verifies; an unset secret list is refused before any compare.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secrets: unknown,
  nowMs: number = Date.now(),
): Promise<{ body: string; id: string; timestamp: number }> {
  const stored = Array.isArray(secrets) ? secrets : [];
  if (stored.length === 0) requireSecret(undefined);
  const usable = stored.map((s) => requireSecret(s));
  const body = requireRawBody(raw);
  const id = header(raw, "webhook-id");
  const ts = header(raw, "webhook-timestamp");
  const sigs = v1Signatures(header(raw, "webhook-signature") ?? "");
  if (!id || !ts || sigs.length === 0) {
    throw new Error(
      "Brex delivery refused: a Webhook-Id, Webhook-Timestamp or Webhook-Signature header is missing.",
    );
  }
  if (!/^\d+$/.test(ts)) {
    throw new Error("Brex delivery refused: the Webhook-Timestamp header is malformed.");
  }
  const signed = `${id}.${ts}.${body}`;
  let match = false;
  for (const secret of usable) {
    for (const key of keysFor(secret)) {
      const expected = await hmac("SHA-256", key, signed, "base64");
      for (const given of sigs) {
        if (timingSafeEqual(expected, given)) match = true;
      }
    }
  }
  if (!match) throw new Error("Brex delivery refused: the signature does not match.");
  if (!withinTolerance(Number(ts), nowMs)) {
    throw new Error(
      "Brex delivery refused: the signature timestamp is outside the allowed window.",
    );
  }
  return { body, id, timestamp: Number(ts) };
}

/** The verified delivery → its event. Throws on a body that is not a Brex event. */
export function normalizeDelivery(
  body: unknown,
  meta: { id: string; timestamp: number },
): BrexEvent {
  const d = asObject(body);
  const eventType = str(d?.event_type);
  if (!d || !eventType) throw new Error("Not a Brex webhook delivery: expected `event_type`.");
  return {
    eventType,
    webhookId: meta.id,
    timestamp: meta.timestamp,
    companyId: str(d.company_id),
    data: d,
  };
}

/** The secrets Brex returns that are still valid. */
function liveSecrets(body: unknown): string[] {
  const list = Array.isArray(body)
    ? body
    : Array.isArray(asObject(body)?.items)
    ? asObject(body)!.items as unknown[]
    : [];
  const out: string[] = [];
  for (const item of list) {
    const o = asObject(item);
    const secret = str(o?.secret);
    if (secret && o?.status !== "REVOKED") out.push(secret);
  }
  return out;
}

/** Build the Brex event webhook trigger. */
export function webhookTrigger(
  spec: { key: string; title: string; description: string },
): TriggerDefinition<TriggerParams, BrexEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [EVENT_TYPES_PARAM],
    output: OUTPUT,
    sample: SAMPLE,

    async onSubscribe({ params, callbackUrl, subscriptionId }, ctx: HookContext) {
      const client = new BrexClient(ctx);
      const created = await client.json<{ id?: string }>(v1("/webhooks"), {
        method: "POST",
        body: { url: callbackUrl, event_types: chooseEventTypes(params?.eventTypes) },
        idempotencyKey: `w6w-${subscriptionId}`,
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Brex created the webhook but returned no id.");
      try {
        const secrets = liveSecrets(await client.json(v1("/webhooks/secrets")));
        if (secrets.length === 0) throw new Error("Brex returned no webhook signing secret.");
        return { webhookId, secrets };
      } catch (err) {
        // A webhook whose deliveries cannot be verified is useless: take it down again.
        try {
          await client.json(v1(`/webhooks/${encodeId(webhookId)}`), { method: "DELETE" });
        } catch { /* best-effort rollback */ }
        throw err;
      }
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookId) return;
      try {
        await new BrexClient(ctx).json(v1(`/webhooks/${encodeId(s.webhookId)}`), {
          method: "DELETE",
        });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Brex delivers webhooks with POST, not ${raw.method}.`);
      }
      const { body, id, timestamp } = await verifyDelivery(raw, state?.secrets);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Brex delivery refused: the body is not JSON.");
      }
      const event = normalizeDelivery(parsed, { id, timestamp });
      // Event types the user did not pick are acknowledged without a run.
      if (!chooseEventTypes(params?.eventTypes).includes(event.eventType)) return [];
      return [event];
    },
  };
}
