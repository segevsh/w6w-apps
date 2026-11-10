import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { MandrillClient } from "./client.ts";

/**
 * Mandrill (Mailchimp Transactional) webhook trigger (rfcs/trigger.md, webhook form,
 * API-registered, signed).
 *
 *   - `onSubscribe` registers the callback URL with `POST webhooks/add` for the chosen message
 *     events. Mandrill returns the webhook's `id` and its `auth_key` (the signing key, D5 (1): the
 *     vendor chooses, we store); both are kept in the subscription `state` together with the URL,
 *     because the signature covers the URL exactly as registered.
 *   - `onUnsubscribe` removes it with `POST webhooks/delete`; one Mandrill no longer has counts as
 *     deleted.
 *   - `handleIngest` verifies `X-Mandrill-Signature`: base64 HMAC-SHA1 of the callback URL followed
 *     by every POST variable's name and value (sorted by name, no delimiter; the only variable is
 *     `mandrill_events`) under the webhook's `auth_key`, BEFORE it parses the batch.
 *
 * Registration probe: while `webhooks/add` runs Mandrill checks the URL with a HEAD, then a POST of
 * an EMPTY batch signed with a generic key ("test-webhook"); the subscription has no state yet.
 * That one shape — no stored key, an empty `mandrill_events` array — is acknowledged without
 * emitting anything. A non-empty batch with no stored key is refused like any unverified delivery.
 *
 * Trust model: the signature binds the URL and the batch, so tampered data is refused. The scheme
 * has no timestamp, so an identical delivery replayed later is not detected; de-duplicate on the
 * message id and event time downstream.
 *
 * Docs (verified 2026-11-10): https://mailchimp.com/developer/transactional/docs/webhooks/,
 * https://mailchimp.com/developer/transactional/guides/track-respond-activity-webhooks/
 * ("Authenticating webhook requests") and
 * https://mailchimp.com/developer/transactional/api/webhooks/add.md
 */

export interface TriggerParams {
  events?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: number;
  /** The webhook's signing key (`auth_key`). */
  authKey: string;
  /** The callback URL exactly as registered; the signature covers it. */
  url: string;
}

/** The run's `trigger.event`: one Mandrill message event. */
export interface MandrillEvent {
  event: string;
  timestamp: number | null;
  messageId: string | null;
  email: string | null;
  subject: string | null;
  sender: string | null;
  state: string | null;
  tags: unknown[];
  url: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
}

const MESSAGE_EVENTS = [
  "send",
  "deferral",
  "hard_bounce",
  "soft_bounce",
  "delivered",
  "open",
  "click",
  "spam",
  "unsub",
  "reject",
];

const DEFAULT_EVENTS = ["send", "hard_bounce", "soft_bounce", "open", "click", "reject"];

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  advanced: true,
  hint: `Comma-separated events to fire on: ${MESSAGE_EVENTS.join(", ")}. Leave empty for ${
    DEFAULT_EVENTS.join(", ")
  }.`,
};

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "timestamp", type: "number", label: "Event time (epoch seconds)" },
  { key: "messageId", type: "string", label: "Message ID" },
  { key: "email", type: "string", label: "Recipient" },
  { key: "subject", type: "string", label: "Subject" },
  { key: "sender", type: "string", label: "Sender" },
  { key: "state", type: "string", label: "Message state" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "url", type: "string", label: "Clicked URL" },
  { key: "reason", type: "string", label: "Bounce or reject reason" },
  { key: "metadata", type: "object", label: "Message metadata" },
  { key: "data", type: "object", label: "Full event data" },
];

const SAMPLE: MandrillEvent = {
  event: "click",
  timestamp: 1762770600,
  messageId: "7761629",
  email: "ada@example.com",
  subject: "Welcome",
  sender: "hello@example.com",
  state: "sent",
  tags: ["welcome"],
  url: "https://www.example.com/sale",
  reason: null,
  metadata: { user_id: 111 },
  data: { event: "click", ts: 1762770600, _id: "7761629", url: "https://www.example.com/sale" },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such webhook" answer `MandrillClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error &&
    (/^Mandrill 404\b/.test(err.message) || /unknown[_ ]webhook/i.test(err.message));
}

/** The user's event list (default set) → validated names. */
export function chooseEvents(raw: string | undefined): string[] {
  const wanted = (raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const list = wanted.length > 0 ? wanted : DEFAULT_EVENTS;
  const bad = list.filter((e) => !MESSAGE_EVENTS.includes(e));
  if (bad.length > 0) {
    throw new Error(
      `Unknown Mandrill event(s): ${bad.join(", ")}. Use ${MESSAGE_EVENTS.join(", ")}.`,
    );
  }
  return [...new Set(list)];
}

/** The batch inside the form body: the parsed array, or null when it is not a JSON array. */
function parseBatch(form: URLSearchParams): unknown[] | null {
  try {
    const v = JSON.parse(form.get("mandrill_events") ?? "");
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** The text Mandrill signs: the URL, then each POST variable's name and value, sorted by name. */
export function signedText(url: string, form: URLSearchParams): string {
  const names = [...new Set([...form.keys()])].sort();
  return url + names.map((n) => n + (form.get(n) ?? "")).join("");
}

/**
 * Verify the delivery's signature against the stored key and URL and return the batch. Throws
 * (never echoing the key, the signature or the body) unless it verifies. The one exception is the
 * registration probe described above, which returns an empty batch.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  state: Partial<TriggerState> | undefined,
): Promise<unknown[]> {
  if (typeof state?.authKey !== "string" || state.authKey === "") {
    const batch = parseBatch(new URLSearchParams(requireRawBody(raw)));
    if (batch !== null && batch.length === 0) return [];
    requireSecret(state?.authKey); // throws: no stored key, so nothing can be verified
  }
  const key = requireSecret(state?.authKey);
  const body = requireRawBody(raw);
  const sent = header(raw, "x-mandrill-signature");
  if (!sent) throw new Error("Mandrill delivery refused: the signature header is missing.");
  if (typeof state?.url !== "string" || state.url === "") {
    throw new Error("Mandrill delivery refused: the subscription has no stored callback URL.");
  }
  const form = new URLSearchParams(body);
  const expected = await hmac("SHA-1", key, signedText(state.url, form), "base64");
  if (!timingSafeEqual(expected, sent.trim())) {
    throw new Error("Mandrill delivery refused: the signature does not match.");
  }
  const batch = parseBatch(form);
  if (batch === null) throw new Error("Not a Mandrill webhook delivery: expected mandrill_events.");
  return batch;
}

/** One message event of a verified batch; sync and inbound items are not message events. */
export function normalizeEvent(item: unknown): MandrillEvent | null {
  const d = asObject(item);
  const event = str(d?.event);
  if (!d || !event || !MESSAGE_EVENTS.includes(event)) return null;
  const msg = asObject(d.msg);
  const ts = Number(d.ts);
  return {
    event,
    timestamp: Number.isFinite(ts) && d.ts != null ? ts : null,
    messageId: str(d._id) ?? str(msg?._id),
    email: str(msg?.email),
    subject: str(msg?.subject),
    sender: str(msg?.sender),
    state: str(msg?.state),
    tags: Array.isArray(msg?.tags) ? msg.tags : [],
    url: str(d.url),
    reason: str(msg?.bounce_description) ?? str(msg?.diag),
    metadata: asObject(msg?.metadata) ?? {},
    data: d,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
}

/** Build the Mandrill email-event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, MandrillEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [EVENTS_PARAM],
    output: OUTPUT,
    sample: SAMPLE,

    async onSubscribe({ params, callbackUrl, subscriptionId }, ctx: HookContext) {
      const events = chooseEvents(params.events);
      const res = await new MandrillClient(ctx).request<{ id?: unknown; auth_key?: unknown }>(
        "/webhooks/add.json",
        { url: callbackUrl, description: `w6w trigger ${subscriptionId}`, events },
      );
      const webhookId = Number(res?.id);
      const authKey = str(res?.auth_key);
      if (!Number.isInteger(webhookId)) {
        throw new Error("Mandrill did not return the new webhook's id.");
      }
      if (!authKey) {
        // Never leave a webhook behind whose deliveries could not be verified.
        try {
          await new MandrillClient(ctx).request("/webhooks/delete.json", { id: webhookId });
        } catch { /* best-effort rollback */ }
        throw new Error("Mandrill did not return the new webhook's signing key.");
      }
      return { webhookId, authKey, url: callbackUrl };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const id = (state as Partial<TriggerState> | undefined)?.webhookId;
      if (typeof id !== "number") return;
      try {
        await new MandrillClient(ctx).request("/webhooks/delete.json", { id });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Mandrill delivers webhooks with POST, not ${raw.method}.`);
      }
      const batch = await verifyDelivery(raw, state as Partial<TriggerState> | undefined);
      const wanted = chooseEvents(params?.events);
      const out: MandrillEvent[] = [];
      for (const item of batch) {
        const e = normalizeEvent(item);
        if (e && wanted.includes(e.event)) out.push(e);
      }
      return out;
    },
  };
}
