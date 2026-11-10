import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { header, requireRawBody } from "../../_shared/webhook/mod.ts";

/**
 * HighLevel webhook triggers (rfcs/trigger.md, webhook form, manual receiver, signed with an
 * ASYMMETRIC key).
 *
 *   - HighLevel webhooks are configured on the Marketplace app (Advanced Settings, Webhooks: turn an
 *     event on and paste the URL beside it), not through the API, so `onSubscribe` makes no HighLevel
 *     call: it hands back the `callbackUrl` the user pastes there and `onUnsubscribe` is a no-op.
 *   - `handleIngest` verifies `X-GHL-Signature` BEFORE it parses anything: an Ed25519 signature
 *     (base64) over the exact request body, checked with HighLevel's published public key. There is
 *     no shared secret, so there is no `signingSecret` param and no `requireSecret`/HMAC compare:
 *     the verification is `crypto.subtle.verify` against the one key HighLevel documents. HighLevel's
 *     legacy RSA `X-WH-Signature` header was documented as deprecated on 2026-09-01 and is not
 *     accepted; a delivery without a valid `X-GHL-Signature` is refused.
 *   - HighLevel documents no timestamp in the signed text, so there is no freshness window; the
 *     callback URL stays private and redeliveries are possible (12 retries on a non-2xx answer).
 *
 * Docs (verified 2026-11-10):
 * https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html (signature
 * headers, public keys, verification flow) and the per-event pages such as
 * https://marketplace.gohighlevel.com/docs/webhook/ContactCreate/index.html
 */

export interface TriggerParams {
  [key: string]: unknown;
}

/** HighLevel's published Ed25519 public key for `X-GHL-Signature` (base64 DER SubjectPublicKeyInfo). */
export const GHL_PUBLIC_KEY_SPKI = "MCowBQYDK2VwAyEAi2HR1srL4o18O8BRa7gVJY7G7bupbN3H9AwJrHCDiOg=";

/** The run's `trigger.event`: one HighLevel webhook event. */
export interface HighLevelEvent {
  type: string;
  locationId: string | null;
  id: string | null;
  contactId: string | null;
  conversationId: string | null;
  data: Record<string, unknown>;
}

export const OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event type" },
  { key: "locationId", type: "string", label: "Location (sub-account) ID" },
  { key: "id", type: "string", label: "Record ID (contact, opportunity, appointment or message)" },
  { key: "contactId", type: "string", label: "Contact ID" },
  { key: "conversationId", type: "string", label: "Conversation ID (message events)" },
  { key: "data", type: "object", label: "Full event payload" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Check `X-GHL-Signature` (Ed25519, base64) over the exact bytes received. Throws (never echoing the
 * signature or the header) unless it verifies; an absent, empty or malformed signature is refused.
 * `publicKey` defaults to HighLevel's published key; only tests pass another.
 */
export async function verifySignature(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  publicKey: string = GHL_PUBLIC_KEY_SPKI,
): Promise<string> {
  const body = requireRawBody(raw);
  const given = header(raw, "x-ghl-signature");
  if (given === undefined || given === "" || given === "N/A") {
    throw new Error("HighLevel delivery refused: the X-GHL-Signature header is missing.");
  }
  let ok = false;
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      base64ToBytes(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    ok = await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      base64ToBytes(given),
      new TextEncoder().encode(body),
    );
  } catch {
    ok = false;
  }
  if (!ok) throw new Error("HighLevel delivery refused: the signature does not verify.");
  return body;
}

/** The verified body → the run's event. */
export function normalizeDelivery(body: unknown): HighLevelEvent {
  const d = asObject(body);
  const type = str(d?.type);
  if (!d || !type) throw new Error("Not a HighLevel webhook delivery: expected `type`.");
  const appt = asObject(d.appointment);
  const id = str(appt?.id) ?? str(d.messageId) ?? str(d.id);
  return {
    type,
    // Location events (LocationCreate, LocationUpdate) carry the location's own id as `id`.
    locationId: str(d.locationId) ?? (type.startsWith("Location") ? id : null),
    id,
    contactId: str(d.contactId) ?? str(appt?.contactId) ?? (type.startsWith("Contact") ? id : null),
    conversationId: str(d.conversationId),
    data: d,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The HighLevel webhook event `type` this trigger fires on. */
  eventType: string;
  sample: HighLevelEvent;
}

/** POST only, signature first, then JSON, then the normalised event. */
async function verifiedEvent(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  publicKey: string,
): Promise<HighLevelEvent> {
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error(`HighLevel delivers webhooks with POST, not ${raw.method}.`);
  }
  const body = await verifySignature(raw, publicKey);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("HighLevel delivery refused: the body is not JSON.");
  }
  return normalizeDelivery(parsed);
}

/** Build one HighLevel event webhook trigger. `publicKey` is for tests only. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
  publicKey: string = GHL_PUBLIC_KEY_SPKI,
): TriggerDefinition<TriggerParams, HighLevelEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw }) {
      const event = await verifiedEvent(raw, publicKey);
      // The URL may be pasted beside several events; other types are acknowledged, no run.
      if (event.type !== spec.eventType) return [];
      return [event];
    },
  };
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated HighLevel webhook event names to start a run for, e.g. ContactUpdate,TaskCreate. Leave empty for every event delivered to this URL.",
};

/** The comma-separated `events` filter → lowercase names; empty means "every event". */
export function eventFilter(v: unknown): string[] {
  return typeof v === "string"
    ? v.split(",").map((s) => s.trim().toLowerCase()).filter((s) => s !== "")
    : [];
}

/**
 * The Any-event trigger: the same signed manual webhook, but it starts a run for every verified
 * delivery whose `type` is in the `events` list (all of them when the list is empty).
 */
export function anyEventTrigger(
  spec: { key: string; title: string; description: string; sample: HighLevelEvent },
  publicKey: string = GHL_PUBLIC_KEY_SPKI,
): TriggerDefinition<TriggerParams, HighLevelEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [EVENTS_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      const event = await verifiedEvent(raw, publicKey);
      const wanted = eventFilter(params?.events);
      if (wanted.length > 0 && !wanted.includes(event.type.toLowerCase())) return [];
      return [event];
    },
  };
}

/**
 * "New <record>" over a bounded collection: diff the ids against the previous check (added only).
 * `pollSnapshot` keeps only `{ id: hash }`, never the records; the events are the new records.
 */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
  what: string;
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = asObject(item)?.id;
    if (typeof id !== "string" || id === "") {
      throw new Error(`HighLevel returned a ${o.what} without an id.`);
    }
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
