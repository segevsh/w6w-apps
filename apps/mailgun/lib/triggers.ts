import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { csv, MailgunClient } from "./client.ts";

/**
 * Mailgun webhook trigger (rfcs/trigger.md, webhook form, API-registered).
 *
 *   - `onSubscribe` registers the callback URL for each chosen event with
 *     `POST /v3/domains/{domain}/webhooks` (form fields `id` = the event, `url`); if any fails the
 *     ones already created are removed again and the error propagates.
 *   - `onUnsubscribe` deletes them with `DELETE /v3/domains/{domain}/webhooks/{event}`; one Mailgun
 *     no longer has (404) counts as deleted.
 *   - `handleIngest` verifies the signature object Mailgun puts in the delivery
 *     (`timestamp`, `token`, `signature`): hex HMAC-SHA256 of `timestamp + token` under the HTTP
 *     webhook signing key (D5 (2)), within five minutes of now, BEFORE it reads any event data.
 *
 * Trust model: Mailgun signs the timestamp and token, NOT the body. A valid signature proves the
 * sender holds the signing key and the delivery is recent; it does not bind the event data. A
 * captured (timestamp, token, signature) triple could be replayed with a different body for five
 * minutes. Token replay caching needs a state write, which `handleIngest` cannot do.
 *
 * Docs (verified 2026-11-09): https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/webhooks,
 * https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks and
 * https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domain-webhooks
 */

export interface TriggerParams {
  domain: string;
  events?: string;
  signingKey?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  domain: string;
  /** The Mailgun webhook ids (`delivered`, `permanent_fail`, ...) this subscription registered. */
  hooks: string[];
}

/** The run's `trigger.event`: one Mailgun event. */
export interface MailgunEvent {
  event: string;
  eventId: string | null;
  timestamp: number | null;
  recipient: string | null;
  domain: string | null;
  messageId: string | null;
  severity: string | null;
  reason: string | null;
  url: string | null;
  tags: unknown[];
  data: Record<string, unknown>;
}

/** Event name a user picks → the Mailgun webhook id that delivers it. */
const HOOK_FOR_EVENT: Record<string, string> = {
  delivered: "delivered",
  opened: "opened",
  clicked: "clicked",
  failed: "permanent_fail",
  complained: "complained",
  unsubscribed: "unsubscribed",
};

const DEFAULT_EVENTS = Object.keys(HOOK_FOR_EVENT);

const DOMAIN_PARAM: Param = {
  key: "domain",
  label: "Domain",
  type: "string",
  required: true,
  hint: "The sending domain to watch, e.g. mg.example.com (Get Many Domains lists them).",
};

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  advanced: true,
  hint: `Comma-separated events to fire on: ${
    DEFAULT_EVENTS.join(", ")
  }. Leave empty for all of them.`,
};

const SIGNING_KEY_PARAM: Param = {
  key: "signingKey",
  label: "HTTP Webhook Signing Key",
  type: "secret",
  required: true,
  hint:
    "Mailgun Settings, API Security, HTTP webhook signing key (account-wide). Mailgun signs every delivery with it; a delivery that does not verify is refused.",
};

const OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "timestamp", type: "number", label: "Timestamp (epoch seconds)" },
  { key: "recipient", type: "string", label: "Recipient" },
  { key: "domain", type: "string", label: "Domain" },
  { key: "messageId", type: "string", label: "Message ID" },
  { key: "severity", type: "string", label: "Severity (failed events)" },
  { key: "reason", type: "string", label: "Reason (failed events)" },
  { key: "url", type: "string", label: "Clicked URL" },
  { key: "tags", type: "array", label: "Tags" },
  { key: "data", type: "object", label: "Full Event Data" },
];

const SAMPLE: MailgunEvent = {
  event: "delivered",
  eventId: "CPgfbmQMTCKtHW6uIWtuVe",
  timestamp: 1762683300,
  recipient: "ada@example.com",
  domain: "mg.example.com",
  messageId: "20261109101500.1.ABCDEF@mg.example.com",
  severity: null,
  reason: null,
  url: null,
  tags: ["welcome"],
  data: { event: "delivered", recipient: "ada@example.com", "log-level": "info" },
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** True for the "no such webhook" answer `MailgunClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Mailgun 404\b/.test(err.message);
}

const hookPath = (domain: string, id?: string) =>
  `/v3/domains/${encodeURIComponent(domain)}/webhooks${id ? `/${encodeURIComponent(id)}` : ""}`;

/** The user's event list (default all) → validated names. */
export function chooseEvents(raw: string | undefined): string[] {
  const wanted = csv(raw?.toLowerCase()) ?? DEFAULT_EVENTS;
  const bad = wanted.filter((e) => !(e in HOOK_FOR_EVENT));
  if (bad.length > 0) {
    throw new Error(
      `Unknown Mailgun event(s): ${bad.join(", ")}. Use ${DEFAULT_EVENTS.join(", ")}.`,
    );
  }
  return [...new Set(wanted)];
}

/** The raw body parsed as JSON (current format) or urlencoded fields (legacy format). */
function parseBody(body: string): Record<string, unknown> {
  try {
    const obj = asObject(JSON.parse(body));
    if (obj) return obj;
  } catch { /* not JSON: try the legacy form encoding */ }
  const form = new URLSearchParams(body);
  const out: Record<string, unknown> = {};
  for (const [k, v] of form) out[k] = v;
  return out;
}

/** The signature triple: nested `signature` object (JSON) or flat fields (legacy form). */
function signatureParts(parsed: Record<string, unknown>) {
  const nested = asObject(parsed.signature);
  const src = nested ?? parsed;
  return { timestamp: str(src.timestamp), token: str(src.token), signature: str(src.signature) };
}

/**
 * Verify the delivery's signature object against the signing key and the clock. Returns the parsed
 * body. Throws (never echoing the key, the signature, the token or the body) unless it verifies;
 * an unset key is refused before any compare. The event data is NOT covered by the signature.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  signingKey: unknown,
  nowMs: number = Date.now(),
): Promise<Record<string, unknown>> {
  const key = requireSecret(signingKey);
  const body = requireRawBody(raw);
  const parsed = parseBody(body);
  const { timestamp, token, signature } = signatureParts(parsed);
  if (!timestamp || !token || !signature) {
    throw new Error("Mailgun delivery refused: the signature object is missing or incomplete.");
  }
  const ts = Number(timestamp);
  if (!/^\d+$/.test(timestamp) || !withinTolerance(ts, nowMs)) {
    throw new Error(
      "Mailgun delivery refused: the signature timestamp is outside the allowed window.",
    );
  }
  const expected = await hmac("SHA-256", key, timestamp + token, "hex");
  if (!timingSafeEqual(expected, signature)) {
    throw new Error("Mailgun delivery refused: the signature does not match.");
  }
  return parsed;
}

/** The verified delivery → its event (current `event-data` shape, or the legacy flat one). */
export function normalizeDelivery(parsed: Record<string, unknown>): MailgunEvent {
  const ed = asObject(parsed["event-data"]);
  const d = ed ?? parsed;
  const message = asObject(asObject(d.message)?.headers);
  const status = asObject(d["delivery-status"]);
  const flags = asObject(d.flags);
  const rawEvent = str(d.event);
  // The legacy format names permanent failures `bounced`/`dropped`; the current one says `failed`.
  const event = rawEvent === "bounced" || rawEvent === "dropped" ? "failed" : rawEvent;
  if (!event) throw new Error("Not a Mailgun webhook delivery: expected an event.");
  const tags = Array.isArray(d.tags) ? d.tags : typeof d.tag === "string" ? [d.tag] : [];
  return {
    event,
    eventId: str(d.id),
    timestamp: Number.isFinite(Number(d.timestamp)) ? Number(d.timestamp) : null,
    recipient: str(d.recipient),
    domain: str(asObject(d.domain)?.name) ?? str(d.domain) ?? str(asObject(d.envelope)?.domain),
    messageId: str(message?.["message-id"]) ?? str(d["message-id"]) ?? str(d["Message-Id"]),
    severity: str(d.severity),
    reason: str(d.reason) ?? str(status?.description) ?? str(flags?.reason),
    url: str(d.url),
    tags,
    data: d,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
}

/** Build the Mailgun email-event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, MailgunEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [DOMAIN_PARAM, EVENTS_PARAM, SIGNING_KEY_PARAM],
    output: OUTPUT,
    sample: SAMPLE,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const domain = params.domain?.trim();
      if (!domain) throw new Error("Choose the Mailgun domain to watch.");
      const hooks = [...new Set(chooseEvents(params.events).map((e) => HOOK_FOR_EVENT[e]))];
      const client = new MailgunClient(ctx);
      const made: string[] = [];
      try {
        for (const id of hooks) {
          await client.postForm(hookPath(domain), { id, url: callbackUrl });
          made.push(id);
        }
      } catch (err) {
        for (const id of made) {
          try {
            await client.request(hookPath(domain, id), { method: "DELETE" });
          } catch { /* best-effort rollback */ }
        }
        throw err;
      }
      return { domain, hooks: made };
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.domain || !Array.isArray(s.hooks)) return;
      const client = new MailgunClient(ctx);
      for (const id of s.hooks) {
        try {
          await client.request(hookPath(s.domain, id), { method: "DELETE" });
        } catch (err) {
          if (!isGone(err)) throw err;
        }
      }
    },

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Mailgun delivers webhooks with POST, not ${raw.method}.`);
      }
      const parsed = await verifyDelivery(raw, params?.signingKey);
      const event = normalizeDelivery(parsed);
      const wanted = params?.events ? chooseEvents(params.events) : DEFAULT_EVENTS;
      if (!wanted.includes(event.event)) return [];
      return [event];
    },
  };
}
