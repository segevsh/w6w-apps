import type { OutputField, Param, TriggerDefinition } from "@w6w/types";

/**
 * Vero webhook trigger (rfcs/trigger.md, webhook form, manual receiver, UNSIGNED).
 *
 *   - Vero webhooks are set up in Vero (Settings, Integrations, Webhooks), not through the Track API,
 *     and Vero sends every event to ONE notification address, so `onSubscribe` makes no Vero call:
 *     it hands back the `callbackUrl` the user pastes there, and `onUnsubscribe` is a no-op.
 *   - `handleIngest` has nothing to verify: Vero's webhook documentation describes no signature,
 *     secret or signing header, so none is invented. The delivery is a JSON POST whose `type` names
 *     the event; the trigger checks the method and the shape and drops types the `events` param
 *     leaves out.
 *
 * Trust model: the callback URL is the secret. The host issues it per subscription as a long
 * unguessable id; anyone who learns it can post a forged delivery to it. Vero does not retry a
 * failed delivery.
 *
 * Docs (verified 2026-11-10): https://help.getvero.com/vero-1/integrations/setting-up-webhooks
 */

export interface TriggerParams {
  events?: string;
}

/** The run's `trigger.event`: one Vero webhook delivery. */
export interface VeroEvent {
  type: string;
  /** Epoch seconds from the delivery's `<type>_at` field, when Vero sends one. */
  occurredAt: number | null;
  userId: string | null;
  email: string | null;
  campaign: Record<string, unknown> | null;
  messageId: string | null;
  bounceType: string | null;
  bounceCode: number | null;
  bounceMessage: string | null;
  userAgent: string | null;
  ip: string | null;
  bot: boolean | null;
  changes: Record<string, unknown> | null;
  data: Record<string, unknown>;
}

/** The event `type`s Vero's setup page lists, email events first. */
export const ALL_EVENTS = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "failed",
  "bounced",
  "converted",
  "unsubscribed",
  "resubscribed",
  "complained",
  "user_created",
  "user_updated",
];

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  advanced: true,
  hint: `Comma-separated Vero event types to fire on: ${
    ALL_EVENTS.join(", ")
  }. Leave empty for every event Vero sends to this URL.`,
};

const OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event type" },
  { key: "occurredAt", type: "number", label: "Occurred at (epoch seconds)" },
  { key: "userId", type: "string", label: "Vero user ID" },
  { key: "email", type: "string", label: "User email" },
  { key: "campaign", type: "object", label: "Campaign" },
  { key: "messageId", type: "string", label: "Message ID" },
  { key: "bounceType", type: "string", label: "Bounce type (hard or soft)" },
  { key: "bounceCode", type: "number", label: "Bounce code" },
  { key: "bounceMessage", type: "string", label: "Bounce or failure message" },
  { key: "userAgent", type: "string", label: "User agent (opens and clicks)" },
  { key: "ip", type: "string", label: "IP address (opens and clicks)" },
  { key: "bot", type: "boolean", label: "Opened or clicked by a bot" },
  { key: "changes", type: "object", label: "Property and tag changes (user_updated)" },
  { key: "data", type: "object", label: "Full Delivery" },
];

const SAMPLE: VeroEvent = {
  type: "opened",
  occurredAt: 1762683300,
  userId: "123",
  email: "ada@example.com",
  campaign: { id: 987, type: "transactional", name: "Order confirmation", channel: "email" },
  messageId: "20261109101500.1.ABCDEF@veromail.com",
  bounceType: null,
  bounceCode: null,
  bounceMessage: null,
  userAgent: "Mozilla/5.0 (compatible)",
  ip: "203.0.113.7",
  bot: false,
  changes: null,
  data: {
    opened_at: 1762683300,
    type: "opened",
    user: { id: 123, email: "ada@example.com" },
    campaign: { id: 987, type: "transactional", name: "Order confirmation", channel: "email" },
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

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The user's event list (default: all) → validated names. */
export function chooseEvents(raw: string | undefined): string[] {
  const wanted = (raw ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return ALL_EVENTS;
  const bad = wanted.filter((e) => !ALL_EVENTS.includes(e));
  if (bad.length > 0) {
    throw new Error(`Unknown Vero event(s): ${bad.join(", ")}. Use ${ALL_EVENTS.join(", ")}.`);
  }
  return [...new Set(wanted)];
}

/** The delivery body → its object. Vero webhooks always POST JSON. */
function parseDelivery(raw: { body: unknown }): Record<string, unknown> {
  let body = raw.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch { /* falls through to the refusal below */ }
  }
  const obj = asObject(body);
  if (!obj) throw new Error("Vero delivery refused: the body is not a JSON object.");
  return obj;
}

/** One delivery → its event. */
export function normalizeDelivery(body: Record<string, unknown>): VeroEvent {
  const type = str(body.type);
  if (!type) throw new Error("Not a Vero webhook delivery: expected a type.");
  const user = asObject(body.user);
  return {
    type,
    occurredAt: num(body[`${type}_at`]),
    userId: str(user?.id) ?? str(body.id),
    email: str(user?.email) ?? str(body.email),
    campaign: asObject(body.campaign),
    messageId: str(body.message_id),
    bounceType: str(body.bounce_type),
    bounceCode: num(body.bounce_code),
    bounceMessage: str(body.bounce_message),
    userAgent: str(body.user_agent),
    ip: str(body.ip),
    bot: typeof body.bot === "boolean" ? body.bot : null,
    changes: asObject(body.changes),
    data: body,
  };
}

/** Build the Vero webhook trigger. */
export function webhookTrigger(
  spec: { key: string; title: string; description: string },
): TriggerDefinition<TriggerParams, VeroEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [EVENTS_PARAM],
    output: OUTPUT,
    sample: SAMPLE,

    onSubscribe({ params, callbackUrl }) {
      chooseEvents(params?.events); // refuse an unknown event name up front
      return { callbackUrl };
    },

    onUnsubscribe() {},

    handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Vero delivers webhooks with POST, not ${raw.method}.`);
      }
      const event = normalizeDelivery(parseDelivery(raw));
      return chooseEvents(params?.events).includes(event.type) ? [event] : [];
    },
  };
}
