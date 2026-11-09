import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { API_VERSION, StripeClient } from "./client.ts";

/**
 * Stripe webhook triggers (https://docs.stripe.com/webhooks, verified 2026-11-09).
 *
 *   - `onSubscribe` creates a webhook endpoint (`POST /v1/webhook_endpoints`) pointed at the
 *     host's `callbackUrl`, after deleting any endpoint already pointed there (the URL is unique
 *     to the subscription, so one carrying it is a leftover of an attempt that never recorded
 *     its id, and its signing secret is lost: Stripe returns `secret` only at creation). The
 *     `whsec_` secret from the response is kept in the subscription state (D5 (1)).
 *   - `onUnsubscribe` deletes the endpoint; one Stripe no longer has counts as deleted.
 *   - `handleIngest` verifies `Stripe-Signature` (`t=<ts>,v1=<hex>[,v1=<hex>]`, HMAC-SHA256 of
 *     `<ts>.<raw body>` under the endpoint secret) over the raw bytes, within Stripe's 5-minute
 *     tolerance, BEFORE parsing anything. A delivery that does not verify throws.
 */

/** Stripe's documented default tolerance between the signed timestamp and now. */
export const TOLERANCE_SEC = 300;

/** Most pages of the account's endpoints `onSubscribe` reads looking for a leftover. */
const MAX_ENDPOINT_PAGES = 10;

export interface TriggerParams {
  /** Generic trigger only: comma-separated Stripe event types, or `*`. */
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  /** The endpoint's `whsec_` signing secret, returned by Stripe once, at creation. */
  secret: string;
  events: string[];
}

/** The run's `trigger.event`: the Stripe event, with `data.object` lifted to `object`. */
export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  account: string | null;
  apiVersion: string | null;
  requestId: string | null;
  object: Record<string, unknown>;
  previousAttributes: Record<string, unknown> | null;
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Event types",
  type: "string",
  required: true,
  placeholder: "charge.dispute.created, payout.paid",
  hint:
    "Comma-separated Stripe event types, or * for every event. Full list: https://docs.stripe.com/api/events/types",
};

const EVENT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "type", type: "string", label: "Event Type" },
  { key: "created", type: "number", label: "Created (Unix seconds)" },
  { key: "livemode", type: "boolean", label: "Live Mode" },
  { key: "account", type: "string", label: "Connected Account" },
  { key: "apiVersion", type: "string", label: "API Version" },
  { key: "requestId", type: "string", label: "Request ID" },
  { key: "object", type: "object", label: "Object (data.object)" },
  { key: "previousAttributes", type: "object", label: "Previous Attributes" },
];

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** Split the generic trigger's comma-separated event list. */
export function parseEventList(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => s !== ""))];
}

/** `Stripe-Signature` → its timestamp and every `v1` signature. Other schemes are ignored. */
export function parseSignatureHeader(value: string): { t: string; v1: string[] } | null {
  let t: string | null = null;
  const v1: string[] = [];
  for (const part of value.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "t" && /^\d{1,15}$/.test(val)) t = val;
    else if (key === "v1" && /^[0-9a-fA-F]+$/.test(val)) v1.push(val.toLowerCase());
  }
  return t !== null && v1.length > 0 ? { t, v1 } : null;
}

/**
 * Verify one delivery and return its parsed event. Throws, saying nothing about the secret, the
 * signature or the header value, unless the signature over the raw body checks out in time.
 */
async function verifiedEvent(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
): Promise<Record<string, unknown>> {
  const body = requireRawBody(raw);
  const key = requireSecret(secret);
  const given = header(raw, "stripe-signature");
  if (given === undefined || given === "") {
    throw new Error("Stripe delivery refused: the Stripe-Signature header is missing.");
  }
  const parsed = parseSignatureHeader(given);
  if (!parsed) {
    throw new Error("Stripe delivery refused: the Stripe-Signature header is not in t=,v1= form.");
  }
  const expected = await hmac("SHA-256", key, `${parsed.t}.${body}`, "hex");
  let matched = false;
  for (const candidate of parsed.v1) {
    if (timingSafeEqual(expected, candidate)) matched = true;
  }
  if (!matched) throw new Error("Stripe delivery refused: the signature does not match.");
  if (!withinTolerance(Number(parsed.t), Date.now(), TOLERANCE_SEC)) {
    throw new Error("Stripe delivery refused: the signed timestamp is outside the tolerance.");
  }
  let event: Record<string, unknown> | null;
  try {
    event = asObject(JSON.parse(body));
  } catch {
    event = null;
  }
  if (!event || event.object !== "event" || !str(event.id) || !str(event.type)) {
    throw new Error("Not a Stripe event: expected an object with object=event, id and type.");
  }
  return event;
}

/** The Stripe event → the run's `trigger.event`. */
export function normalizeEvent(event: Record<string, unknown>): StripeEvent {
  const data = asObject(event.data);
  return {
    id: String(event.id),
    type: String(event.type),
    created: typeof event.created === "number" ? event.created : 0,
    livemode: event.livemode === true,
    account: str(event.account),
    apiVersion: str(event.api_version),
    requestId: str(asObject(event.request)?.id),
    object: asObject(data?.object) ?? {},
    previousAttributes: asObject(data?.previous_attributes),
  };
}

/** Delete one endpoint. One Stripe no longer has is already what we wanted. */
async function deleteEndpoint(client: StripeClient, webhookId: string): Promise<void> {
  try {
    await client.request(`/webhook_endpoints/${encodeURIComponent(webhookId)}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (err instanceof Error && /^Stripe (404|410) /.test(err.message)) return;
    throw err;
  }
}

/** Ids of the account's endpoints that already deliver to `url`. */
async function endpointsPointingAt(client: StripeClient, url: string): Promise<string[]> {
  const found: string[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < MAX_ENDPOINT_PAGES; page++) {
    const res = await client.request<{
      data?: Array<{ id?: unknown; url?: unknown }>;
      has_more?: boolean;
    }>("/webhook_endpoints", { query: { limit: 100, starting_after: startingAfter } });
    const rows = res?.data ?? [];
    for (const row of rows) {
      const id = str(row.id);
      if (id && row.url === url) found.push(id);
    }
    const last = str(rows[rows.length - 1]?.id);
    if (!res?.has_more || !last) break;
    startingAfter = last;
  }
  return found;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The event types this trigger fires on; omitted for the trigger whose events are a param. */
  events?: string[];
  /** A representative `data.object` for the sample. */
  sampleObject?: Record<string, unknown>;
}

/** Build one Stripe webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, StripeEvent, TriggerState> {
  const fixed = spec.events;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [] : [EVENTS_PARAM],
    output: EVENT_OUTPUT,
    sample: {
      id: "evt_1Nq0ZaLkdIwHu7ixXYZ1abcd",
      type: fixed?.[0] ?? "charge.dispute.created",
      created: 1767225600,
      livemode: false,
      account: null,
      apiVersion: API_VERSION,
      requestId: "req_8Kc2fQ1xJm5Ntw",
      object: spec.sampleObject ?? { id: "dp_1Nq0ZaLkdIwHu7ix0abcd", object: "dispute" },
      previousAttributes: null,
    } satisfies StripeEvent,

    async onSubscribe({ params, callbackUrl }, ctx) {
      const events = fixed ?? parseEventList(params.events);
      if (events.length === 0) throw new Error("Choose at least one Stripe event type.");
      const client = new StripeClient(ctx);
      for (const id of await endpointsPointingAt(client, callbackUrl)) {
        await deleteEndpoint(client, id);
      }
      const created = await client.request<{ id?: unknown; secret?: unknown }>(
        "/webhook_endpoints",
        {
          method: "POST",
          form: {
            url: callbackUrl,
            enabled_events: events,
            api_version: API_VERSION,
            description: "w6w trigger subscription",
          },
        },
      );
      const webhookId = str(created?.id);
      const secret = str(created?.secret);
      if (!webhookId) throw new Error("Stripe created the webhook endpoint but returned no id.");
      if (!secret) {
        // Without the secret no delivery can ever be verified: do not leave the endpoint behind.
        await deleteEndpoint(client, webhookId);
        throw new Error("Stripe created the webhook endpoint but returned no signing secret.");
      }
      return { webhookId, secret, events };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteEndpoint(new StripeClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Stripe delivers webhooks with POST, not ${raw.method}.`);
      }
      const event = normalizeEvent(await verifiedEvent(raw, state?.secret));
      const wanted = state?.events ?? [];
      if (wanted.length > 0 && !wanted.includes("*") && !wanted.includes(event.type)) return [];
      return [event];
    },
  };
}
