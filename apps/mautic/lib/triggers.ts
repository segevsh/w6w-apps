import type { OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { MauticClient, MauticError } from "./client.ts";

/**
 * Mautic webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` generates a per-subscription secret (D5 (1) — the Webhooks REST API accepts a
 *     caller-chosen `secret`), deletes a leftover webhook that already points at the callback
 *     URL, and creates the webhook with `POST /api/hooks/new`. The secret lives in the
 *     subscription state.
 *   - `onUnsubscribe` deletes that webhook; one Mautic no longer has counts as deleted.
 *   - `handleIngest` verifies `Webhook-Signature` — base64(HMAC-SHA256(secret, raw body)) —
 *     BEFORE it parses anything. Mautic always signs, so there is no unsigned path. The scheme
 *     carries no timestamp, so there is no replay window to enforce.
 *   - A delivery is `{ "<event type>": [ {payload}, … ] }`; a queued ("background") delivery
 *     aggregates several payloads and several event types, so one delivery can yield several
 *     events — only the ones of this trigger's event type are emitted.
 *
 * Source: https://devdocs.mautic.org/en/7.1/rest_api/webhooks.html and
 * https://devdocs.mautic.org/en/7.1/webhooks/getting_started.html (verified 2026-11-09).
 */

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  event: string;
  secret: string;
}

/** The stored event: one payload of one verified delivery. */
export interface MauticEvent {
  event: string;
  timestamp: string | null;
  resourceId: string | null;
  resource: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event Type" },
  { key: "timestamp", type: "string", label: "Event Time" },
  { key: "resourceId", type: "string", label: "Contact or Submission ID" },
  { key: "resource", type: "object", label: "Event Payload" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

const refused = (why: string) => new Error(`webhook delivery refused: ${why}`);

async function deleteWebhook(client: MauticClient, id: string): Promise<void> {
  try {
    await client.request(`/hooks/${encodeURIComponent(id)}/delete`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof MauticError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

/**
 * Verify a delivery and parse it. `Webhook-Signature` is base64(HMAC-SHA256(secret, raw body));
 * everything is checked BEFORE the body is parsed, and an unset secret is refused before any compare.
 */
async function verifiedDelivery(
  raw: { method: string; rawBody?: unknown; headers: Record<string, string> },
  stored: unknown,
): Promise<Record<string, unknown> | null> {
  if (raw.method.toUpperCase() !== "POST") {
    throw new Error(`Mautic delivers webhooks with POST, not ${raw.method}.`);
  }
  const secret = requireSecret(stored);
  const body = requireRawBody(raw);
  const signature = header(raw, "webhook-signature");
  if (!signature) throw refused("the signature header is missing");
  const expected = await hmac("SHA-256", secret, body, "base64");
  if (!timingSafeEqual(expected, signature)) throw refused("the signature does not match");

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Mautic delivery body is not valid JSON.");
  }
  return asObject(parsed);
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Mautic event type, e.g. `mautic.lead_post_save_new`. */
  event: string;
  /** Where the record's id sits in one payload. */
  idOf(payload: Record<string, unknown>): unknown;
  sample: MauticEvent;
}

/** Build one Mautic webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, MauticEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ subscriptionId, callbackUrl }, ctx) {
      const client = new MauticClient(ctx);
      const name = `w6w ${subscriptionId}`;
      const existing = await client.requestAll<{ id?: unknown; webhookUrl?: unknown }>(
        "/hooks",
        "hooks",
        { query: { search: name } },
      );
      for (const hook of existing) {
        const id = str(hook.id);
        if (id && hook.webhookUrl === callbackUrl) await deleteWebhook(client, id);
      }
      const secret = randomSecret();
      const created = await client.request<{ hook?: { id?: unknown } }>("/hooks/new", {
        method: "POST",
        body: {
          name,
          description: "Created by w6w. Deleted when the trigger is removed.",
          webhookUrl: callbackUrl,
          secret,
          triggers: [spec.event],
          eventsOrderbyDir: "asc",
          isPublished: true,
        },
      });
      const webhookId = str(created?.hook?.id);
      if (!webhookId) throw new Error("Mautic created the webhook but returned no id.");
      return { webhookId, event: spec.event, secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new MauticClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      const delivery = await verifiedDelivery(raw, state?.secret);
      const payloads = delivery?.[spec.event];
      if (!Array.isArray(payloads)) return [];
      const events: MauticEvent[] = [];
      for (const p of payloads) {
        const resource = asObject(p);
        if (!resource) continue;
        events.push({
          event: spec.event,
          timestamp: str(resource.timestamp),
          resourceId: str(spec.idOf(resource)),
          resource,
        });
      }
      return events;
    },
  };
}

/** Every event type in Mautic's webhook catalog (https://devdocs.mautic.org/en/7.1/webhooks/events/index.html, 2026-11-10). */
export const CATALOG_EVENTS = [
  "mautic.lead_post_save_new",
  "mautic.lead_post_save_update",
  "mautic.lead_post_delete",
  "mautic.lead_points_change",
  "mautic.lead_channel_subscription_changed",
  "mautic.lead_company_change",
  "mautic.company_post_save",
  "mautic.company_post_delete",
  "mautic.email_on_send",
  "mautic.email_on_open",
  "mautic.form_on_submit",
  "mautic.page_on_hit",
  "mautic.sms_on_send",
] as const;

/** `events` param → event types. Empty = the whole catalog. Plugins add event types, so any well-formed name is allowed. */
export function resolveEventTypes(events: unknown): string[] {
  const text = typeof events === "string" ? events : "";
  const list = [...new Set(text.split(",").map((t) => t.trim()).filter((t) => t !== ""))];
  if (list.length === 0) return [...CATALOG_EVENTS];
  for (const t of list) {
    if (!/^mautic\.[a-z0-9_.]{1,80}$/.test(t)) {
      throw new Error(
        `Not a Mautic event type: "${t.slice(0, 60)}" (expected e.g. mautic.form_on_submit).`,
      );
    }
  }
  return list;
}

/** The id of whatever record one payload is about (payload keys per the event pages). */
function payloadId(p: Record<string, unknown>): unknown {
  const nested = (k: string) => (p[k] as { id?: unknown } | undefined)?.id;
  return nested("contact") ?? nested("company") ?? nested("submission") ?? nested("hit") ??
    nested("email") ?? p.id;
}

export interface AnyEventState extends TriggerState {
  events: string[];
}

/**
 * The Any-event trigger: ONE Mautic webhook subscribed to the chosen event types (Mautic's
 * `triggers` field takes a list), one stored secret, and a verified delivery yields one event per
 * payload of every chosen type.
 */
export function anyEventTrigger(spec: {
  key: string;
  title: string;
  description: string;
  sample: MauticEvent;
}): TriggerDefinition<{ events?: string }, MauticEvent, AnyEventState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [{
      key: "events",
      label: "Events",
      type: "string",
      default: "",
      hint:
        "Comma-separated Mautic event types (mautic.form_on_submit, mautic.email_on_open, mautic.page_on_hit, …). Empty = every event in Mautic's webhook catalog.",
    }],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx) {
      const events = resolveEventTypes(params?.events);
      const client = new MauticClient(ctx);
      const name = `w6w ${subscriptionId}`;
      const existing = await client.requestAll<{ id?: unknown; webhookUrl?: unknown }>(
        "/hooks",
        "hooks",
        { query: { search: name } },
      );
      for (const hook of existing) {
        const id = str(hook.id);
        if (id && hook.webhookUrl === callbackUrl) await deleteWebhook(client, id);
      }
      const secret = randomSecret();
      const created = await client.request<{ hook?: { id?: unknown } }>("/hooks/new", {
        method: "POST",
        body: {
          name,
          description: "Created by w6w. Deleted when the trigger is removed.",
          webhookUrl: callbackUrl,
          secret,
          triggers: events,
          eventsOrderbyDir: "asc",
          isPublished: true,
        },
      });
      const webhookId = str(created?.hook?.id);
      if (!webhookId) throw new Error("Mautic created the webhook but returned no id.");
      return { webhookId, event: events.join(","), events, secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<AnyEventState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new MauticClient(ctx), webhookId);
    },

    async handleIngest({ raw, state, params }) {
      const delivery = await verifiedDelivery(raw, state?.secret);
      if (!delivery) return [];
      const wanted = new Set(resolveEventTypes(params?.events));
      const events: MauticEvent[] = [];
      for (const [type, payloads] of Object.entries(delivery)) {
        if (!wanted.has(type) || !Array.isArray(payloads)) continue;
        for (const p of payloads) {
          const resource = asObject(p);
          if (!resource) continue;
          events.push({
            event: type,
            timestamp: str(resource.timestamp),
            resourceId: str(payloadId(resource)),
            resource,
          });
        }
      }
      return events;
    },
  };
}
