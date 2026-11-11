import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { GotoWebinarClient } from "./client.ts";

/**
 * GoTo Webinar webhook triggers (rfcs/trigger.md, webhook form, API-registered, signed).
 *
 *   - `onSubscribe` runs GoTo's documented three-step setup through the app's own client:
 *     `POST /webhooks` (callback URL + event name; created INACTIVE), `PUT /webhooks` (state
 *     ACTIVE), `POST /userSubscriptions` (subscribe the connected user). If a step fails the
 *     webhook already created is removed again and the error propagates. The state keeps both keys.
 *   - `onUnsubscribe` deletes the user subscription and then the webhook; a 404 on either counts as
 *     already gone.
 *   - `handleIngest` verifies the delivery BEFORE it parses anything. GoTo signs
 *     `X-Webhook-Signature-Timestamp + ":" + the event body as received` with HMAC-SHA256 under the
 *     webhook secret key and sends the base64 result in `X-Webhook-Signature` (D5 (2): the secret
 *     key is created once with `POST /webhooks/secretkey` and pasted as `signingSecret`; this
 *     trigger does not create one because GoTo keeps one key set per developer application and a
 *     new key would change what every other subscription of that application is signed with).
 *     The timestamp (epoch milliseconds) must be within five minutes of now.
 *   - GoTo's example event carries ids above 2^53 (`webinarKey`, `registrantKey`), which
 *     `JSON.parse` would round; ids are therefore read from the verified text with big integers
 *     quoted first.
 *   - GoTo validates a callback URL with a plain GET that must answer 200: a GET carries no
 *     signature and no body, so it is answered with no events and no run.
 *
 * Docs (verified 2026-11-10): https://developer.goto.com/guides/GoToWebinar/08_HOW_webhooks/,
 * https://developer.goto.com/guides/GoToWebinar/07_HOW_WebHooksOverview/ and
 * https://developer.goto.com/GoToWebinarV2/ (webhooks and userSubscriptions paths)
 */

export interface TriggerParams {
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookKey: string;
  userSubscriptionKey: string;
}

/** The run's `trigger.event`: one GoTo Webinar event. */
export interface GotoEvent {
  eventName: string;
  eventKey: string | null;
  webinarKey: string | null;
  webinarTitle: string | null;
  registrantKey: string | null;
  sessionKey: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  timestamp: string | null;
  data: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Webhook Secret Key",
  type: "secret",
  required: true,
  hint:
    "The `value` returned by GoTo's POST /webhooks/secretkey (one per developer application; see the README). GoTo signs every delivery with it; a delivery that does not verify is refused.",
};

export const OUTPUT: OutputField[] = [
  { key: "eventName", type: "string", label: "Event name" },
  { key: "eventKey", type: "string", label: "Event key" },
  { key: "webinarKey", type: "string", label: "Webinar key" },
  { key: "webinarTitle", type: "string", label: "Webinar title" },
  { key: "registrantKey", type: "string", label: "Registrant key" },
  { key: "sessionKey", type: "string", label: "Session key" },
  { key: "email", type: "string", label: "Registrant email" },
  { key: "firstName", type: "string", label: "Registrant first name" },
  { key: "lastName", type: "string", label: "Registrant last name" },
  { key: "timestamp", type: "string", label: "Event timestamp (ISO)" },
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

/** True for the "no such webhook" answer `GotoWebinarClient` throws. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^GoTo Webinar 404\b/.test(err.message);
}

/**
 * Wrap every integer literal of 16+ digits that sits OUTSIDE a JSON string in quotes, so
 * `JSON.parse` keeps the id exact instead of rounding it to a double. Walks the text tracking
 * string state and escapes; numbers with a fraction or exponent are left alone.
 */
export function quoteBigInts(text: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i] ?? "";
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "-" || (c >= "0" && c <= "9")) {
      let j = i + 1;
      while (j < text.length && /[0-9.eE+-]/.test(text[j])) j++;
      const lit = text.slice(i, j);
      out += /^-?\d{16,}$/.test(lit) ? `"${lit}"` : lit;
      i = j - 1;
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * Verify the delivery's signature headers against the secret key and the clock; returns the exact
 * body text. Throws (never echoing the key, the signature, the timestamp or the body) unless it
 * verifies; an unset key is refused before any compare.
 */
export async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secret: unknown,
  nowMs: number = Date.now(),
): Promise<string> {
  const key = requireSecret(secret);
  const body = requireRawBody(raw);
  const given = header(raw, "x-webhook-signature");
  const stamp = header(raw, "x-webhook-signature-timestamp");
  if (!given || !stamp) {
    throw new Error("GoTo Webinar delivery refused: the signature headers are missing.");
  }
  const version = header(raw, "x-webhook-signature-version");
  if (version !== undefined && version !== "0") {
    throw new Error("GoTo Webinar delivery refused: unsupported signature version.");
  }
  if (!/^\d{1,16}$/.test(stamp) || !withinTolerance(Number(stamp) / 1000, nowMs)) {
    throw new Error(
      "GoTo Webinar delivery refused: the signature timestamp is outside the allowed window.",
    );
  }
  const expected = await hmac("SHA-256", key, `${stamp}:${body}`, "base64");
  if (!timingSafeEqual(expected, given)) {
    throw new Error("GoTo Webinar delivery refused: the signature does not match.");
  }
  return body;
}

/** The verified body text → the run's event. */
export function normalizeDelivery(text: string): GotoEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(quoteBigInts(text));
  } catch {
    throw new Error("GoTo Webinar delivery refused: the body is not JSON.");
  }
  const d = asObject(parsed);
  const eventName = str(d?.eventName);
  if (!d || !eventName) {
    throw new Error("Not a GoTo Webinar webhook delivery: expected `eventName`.");
  }
  return {
    eventName,
    eventKey: str(d.eventKey),
    webinarKey: str(d.webinarKey),
    webinarTitle: str(d.webinarTitle),
    registrantKey: str(d.registrantKey),
    sessionKey: str(d.sessionKey),
    email: str(d.email),
    firstName: str(d.firstName),
    lastName: str(d.lastName),
    timestamp: str(d.timestamp),
    data: d,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The GoTo event name (`registrant.added`, ...). */
  eventName: string;
  sample: GotoEvent;
}

interface Embedded {
  _embedded?: {
    webhooks?: Array<{ webhookKey?: unknown }>;
    userSubscriptions?: Array<{ userSubscriptionKey?: unknown }>;
  };
}

/** Build one GoTo Webinar event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, GotoEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ callbackUrl }, ctx: HookContext) {
      const client = new GotoWebinarClient(ctx);
      const made = await client.request<Embedded>("/webhooks", {
        method: "POST",
        body: [{ callbackUrl, eventName: spec.eventName, eventVersion: "1.0.0", product: "g2w" }],
      });
      const webhookKey = str(made?._embedded?.webhooks?.[0]?.webhookKey);
      if (!webhookKey) {
        throw new Error(
          "GoTo Webinar did not return a webhook key, so the webhook cannot be removed later.",
        );
      }
      try {
        await client.request("/webhooks", {
          method: "PUT",
          body: [{ webhookKey, state: "ACTIVE" }],
        });
        const sub = await client.request<Embedded>("/userSubscriptions", {
          method: "POST",
          body: [{ webhookKey, userSubscriptionState: "ACTIVE" }],
        });
        const userSubscriptionKey = str(
          sub?._embedded?.userSubscriptions?.[0]?.userSubscriptionKey,
        );
        if (!userSubscriptionKey) {
          throw new Error("GoTo Webinar did not return a user subscription key.");
        }
        return { webhookKey, userSubscriptionKey };
      } catch (err) {
        try {
          await client.request("/webhooks", { method: "DELETE", body: [webhookKey] });
        } catch { /* best-effort rollback */ }
        throw err;
      }
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<TriggerState> | undefined;
      if (!s?.webhookKey) return;
      const client = new GotoWebinarClient(ctx);
      if (s.userSubscriptionKey) {
        try {
          await client.request("/userSubscriptions", {
            method: "DELETE",
            body: [s.userSubscriptionKey],
          });
        } catch (err) {
          if (!isGone(err)) throw err;
        }
      }
      try {
        await client.request("/webhooks", { method: "DELETE", body: [s.webhookKey] });
      } catch (err) {
        if (!isGone(err)) throw err;
      }
    },

    async handleIngest({ raw, params }) {
      const method = raw.method.toUpperCase();
      // GoTo validates the callback URL with an unsigned GET that must answer 200: no events.
      if (method === "GET" || method === "HEAD") return [];
      if (method !== "POST") {
        throw new Error(`GoTo Webinar delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifyDelivery(raw, params?.signingSecret);
      const event = normalizeDelivery(body);
      // The webhook is registered for this one event name; anything else is acknowledged, no run.
      if (event.eventName !== spec.eventName) return [];
      return [event];
    },
  };
}

/** The five events GoTo documents for webhooks (https://developer.goto.com/guides/GoToWebinar/07_HOW_WebHooksOverview/). */
export const EVENT_NAMES = [
  "registrant.added",
  "registrant.joined",
  "webinar.created",
  "webinar.changed",
  "survey.submitted",
];

export interface AnyEventParams {
  signingSecret?: string;
  events?: string;
}

/** What the Any-event `onSubscribe` returns: one webhook + user subscription per event. */
export interface AnyEventState {
  webhookKeys: string[];
  userSubscriptionKeys: string[];
}

/** `events` (comma-separated, empty = all five) → validated GoTo event names. */
export function chooseEvents(raw: unknown): string[] {
  const wanted = String(raw ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (wanted.length === 0) return [...EVENT_NAMES];
  const bad = wanted.filter((e) => !EVENT_NAMES.includes(e));
  if (bad.length > 0) {
    throw new Error(
      `Unknown GoTo Webinar event(s): ${bad.join(", ")}. Use ${EVENT_NAMES.join(", ")}.`,
    );
  }
  return [...new Set(wanted)];
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint: `Comma-separated GoTo events to react to: ${
    EVENT_NAMES.join(", ")
  }. Leave empty for all of them.`,
};

/** The Any-event trigger: one GoTo webhook per chosen event, all delivering to this callback URL. */
export function anyEventTrigger(
  spec: { key: string; title: string; description: string; sample: GotoEvent },
): TriggerDefinition<AnyEventParams, GotoEvent, AnyEventState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SIGNING_SECRET_PARAM, EVENTS_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx: HookContext) {
      const events = chooseEvents(params?.events);
      const client = new GotoWebinarClient(ctx);
      const made = await client.request<Embedded>("/webhooks", {
        method: "POST",
        body: events.map((eventName) => ({
          callbackUrl,
          eventName,
          eventVersion: "1.0.0",
          product: "g2w",
        })),
      });
      const webhookKeys = (made?._embedded?.webhooks ?? []).map((w) => str(w?.webhookKey))
        .filter((k): k is string => k !== null);
      if (webhookKeys.length !== events.length) {
        // Remove whatever was created: a webhook we hold no key for could never be removed later.
        if (webhookKeys.length > 0) {
          try {
            await client.request("/webhooks", { method: "DELETE", body: webhookKeys });
          } catch { /* best-effort rollback */ }
        }
        throw new Error(
          "GoTo Webinar did not return a webhook key for every event, so the webhooks cannot be removed later.",
        );
      }
      try {
        await client.request("/webhooks", {
          method: "PUT",
          body: webhookKeys.map((webhookKey) => ({ webhookKey, state: "ACTIVE" })),
        });
        const sub = await client.request<Embedded>("/userSubscriptions", {
          method: "POST",
          body: webhookKeys.map((webhookKey) => ({ webhookKey, userSubscriptionState: "ACTIVE" })),
        });
        const userSubscriptionKeys = (sub?._embedded?.userSubscriptions ?? [])
          .map((u) => str(u?.userSubscriptionKey)).filter((k): k is string => k !== null);
        if (userSubscriptionKeys.length !== webhookKeys.length) {
          throw new Error("GoTo Webinar did not return a user subscription key for every event.");
        }
        return { webhookKeys, userSubscriptionKeys };
      } catch (err) {
        try {
          await client.request("/webhooks", { method: "DELETE", body: webhookKeys });
        } catch { /* best-effort rollback */ }
        throw err;
      }
    },

    async onUnsubscribe({ state }, ctx: HookContext) {
      const s = state as Partial<AnyEventState> | undefined;
      const client = new GotoWebinarClient(ctx);
      if (s?.userSubscriptionKeys?.length) {
        try {
          await client.request("/userSubscriptions", {
            method: "DELETE",
            body: s.userSubscriptionKeys,
          });
        } catch (err) {
          if (!isGone(err)) throw err;
        }
      }
      if (s?.webhookKeys?.length) {
        try {
          await client.request("/webhooks", { method: "DELETE", body: s.webhookKeys });
        } catch (err) {
          if (!isGone(err)) throw err;
        }
      }
    },

    async handleIngest({ raw, params }) {
      const method = raw.method.toUpperCase();
      if (method === "GET" || method === "HEAD") return [];
      if (method !== "POST") {
        throw new Error(`GoTo Webinar delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifyDelivery(raw, params?.signingSecret);
      const event = normalizeDelivery(body);
      const wanted = chooseEvents(params?.events);
      return wanted.includes(event.eventName) ? [event] : [];
    },
  };
}
