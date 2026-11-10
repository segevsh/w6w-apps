import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { header, randomSecret, requireSecret, timingSafeEqual } from "../../_shared/webhook/mod.ts";
import { ActiveCampaignClient } from "./client.ts";

interface TriggerState {
  webhookId: string;
}

interface Webhook {
  id?: string | number;
  url?: string;
}

const output: OutputField[] = [
  { key: "id", type: "string", label: "Contact ID" },
  { key: "email", type: "string", label: "Email" },
  { key: "firstName", type: "string", label: "First name" },
  { key: "lastName", type: "string", label: "Last name" },
];

function id(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
}

function gone(error: unknown): boolean {
  return error instanceof Error && /ActiveCampaign (404|410)\b/.test(error.message);
}

async function remove(client: ActiveCampaignClient, webhookId: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(webhookId)}`, { method: "DELETE" });
  } catch (error) {
    if (!gone(error)) throw error;
  }
}

/** Parses a urlencoded body, expanding bracket keys like contact[id] into nested objects. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function parseForm(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const path = key.split(/\]\[|\[|\]/).filter((part) => part !== "");
    if (path.some((part) => UNSAFE_KEYS.has(part))) continue;
    let node: Record<string, unknown> = root;
    path.forEach((part, index) => {
      if (index === path.length - 1) {
        node[part] = value;
        return;
      }
      const next = node[part];
      node = typeof next === "object" && next !== null
        ? next as Record<string, unknown>
        : (node[part] = {}) as Record<string, unknown>;
    });
  }
  return root;
}

/** ActiveCampaign's webhook API delivers POST form fields without a signature. */
export const newContact: TriggerDefinition<
  Record<string, never>,
  Record<string, unknown>,
  TriggerState
> = {
  key: "new-contact",
  title: "New Contact",
  description: "Fires when a contact subscribes. The run gets the contact.",
  output,
  sample: { id: "42", email: "ada@example.com", firstName: "Ada", lastName: "Lovelace" },

  async onSubscribe({ callbackUrl }, ctx) {
    const client = new ActiveCampaignClient(ctx);
    const listed = await client.request<{ webhooks?: Webhook[] }>("/webhooks");
    for (const webhook of listed.webhooks ?? []) {
      const webhookId = id(webhook.id);
      if (webhookId && webhook.url === callbackUrl) await remove(client, webhookId);
    }
    const created = await client.request<{ webhook?: Webhook }>("/webhooks", {
      method: "POST",
      body: {
        webhook: {
          name: "w6w New Contact",
          url: callbackUrl,
          events: ["subscribe"],
          sources: ["admin", "api", "public", "system"],
        },
      },
    });
    const webhookId = id(created.webhook?.id);
    if (!webhookId) throw new Error("ActiveCampaign created the webhook but returned no id.");
    return { webhookId };
  },

  async onUnsubscribe({ state }, ctx) {
    const webhookId = id(state?.webhookId);
    if (webhookId) await remove(new ActiveCampaignClient(ctx), webhookId);
  },

  handleIngest({ raw }) {
    const call = raw as { method?: unknown; body?: unknown };
    if (String(call.method).toUpperCase() !== "POST") {
      throw new Error("ActiveCampaign delivers webhooks with POST.");
    }
    const body = typeof call.body === "string"
      ? parseForm(call.body)
      : (call.body ?? {}) as Record<string, unknown>;
    const contact = (body.contact ?? body) as Record<string, unknown>;
    const out: Record<string, unknown> = { ...contact };
    out.firstName ??= contact.first_name;
    out.lastName ??= contact.last_name;
    return [out];
  },
};

// ---------------------------------------------------------------------------------------------
// Event webhooks (verified 2026-11-10): https://developers.activecampaign.com/page/webhooks,
// https://developers.activecampaign.com/reference/create-webhook and
// https://developers.activecampaign.com/reference/get-a-list-of-webhook-events
//
// ActiveCampaign does not sign a delivery with an HMAC, but "Create a webhook" accepts custom
// `headers`, one of which may be marked `is_signature: true` ("the signature header; its value is
// blanked in responses"). So each subscription registers a fresh `randomSecret()` as the
// `X-W6W-Webhook-Secret` header (kept in the subscription state) and `handleIngest` compares it in
// constant time BEFORE parsing anything (a shared secret, not a body signature: it does not prove
// the body is unmodified and a captured delivery can be replayed).
// ---------------------------------------------------------------------------------------------

/** Custom delivery header carrying the per-subscription secret. */
export const SECRET_HEADER = "X-W6W-Webhook-Secret";

/** Every webhook event ActiveCampaign documents (the webhooks page plus `GET /webhook/events`). */
export const AC_EVENTS = [
  "subscribe",
  "unsubscribe",
  "update",
  "contact_tag_added",
  "contact_tag_removed",
  "contact_task_add",
  "subscriber_note",
  "list_add",
  "sent",
  "open",
  "click",
  "reply",
  "forward",
  "share",
  "bounce",
  "deal_add",
  "deal_update",
  "deal_note_add",
  "deal_pipeline_add",
  "deal_stage_add",
  "deal_task_add",
  "deal_task_complete",
  "deal_tasktype_add",
  "sms_sent",
  "sms_reply",
  "sms_unsub",
  "account_add",
  "account_update",
  "account_contact_add",
  "account_contact_update",
] as const;

/** What `onSubscribe` returns and the host persists. */
export interface EventState {
  webhookId: string;
  /** The shared secret registered as the `X-W6W-Webhook-Secret` delivery header. */
  secret: string;
  /** The events this webhook was registered for. */
  events: string[];
}

/** The run's `trigger.event`: one ActiveCampaign delivery. */
export interface AcEvent {
  type: string;
  dateTime: string | null;
  initiatedFrom: string | null;
  initiatedBy: string | null;
  contact: Record<string, unknown> | null;
  deal: Record<string, unknown> | null;
  campaign: Record<string, unknown> | null;
  data: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "type", type: "string", label: "Event" },
  { key: "dateTime", type: "string", label: "Date/Time" },
  { key: "initiatedFrom", type: "string", label: "Initiated From" },
  { key: "initiatedBy", type: "string", label: "Initiated By" },
  { key: "contact", type: "object", label: "Contact" },
  { key: "deal", type: "object", label: "Deal" },
  { key: "campaign", type: "object", label: "Campaign" },
  { key: "data", type: "object", label: "Full Payload" },
];

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint: `Comma-separated ActiveCampaign webhook events (${
    AC_EVENTS.join(", ")
  }). Leave empty for all of them.`,
};

function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function text(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** The comma-separated `events` param → the events to register (empty = all; unknown refused). */
export function chooseEvents(events: string | undefined): string[] {
  const asked = (events ?? "").split(",").map((e) => e.trim()).filter((e) => e !== "");
  if (asked.length === 0) return [...AC_EVENTS];
  const known = new Set<string>(AC_EVENTS);
  const bad = asked.filter((e) => !known.has(e));
  if (bad.length > 0) {
    throw new Error(`Unknown ActiveCampaign webhook event(s): ${bad.join(", ")}.`);
  }
  return [...new Set(asked)];
}

export interface EventTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The one event this trigger registers; omit for the Any Event trigger (`events` param). */
  event?: string;
  sample: AcEvent;
}

/** Build one ActiveCampaign event-webhook trigger (a named event, or Any Event when `event` is omitted). */
export function eventTrigger(
  spec: EventTriggerSpec,
): TriggerDefinition<{ events?: string }, AcEvent, EventState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.event ? undefined : [EVENTS_PARAM],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, callbackUrl }, ctx) {
      const events = spec.event ? [spec.event] : chooseEvents(params?.events);
      const secret = randomSecret();
      const client = new ActiveCampaignClient(ctx);
      const listed = await client.request<{ webhooks?: Webhook[] }>("/webhooks");
      for (const webhook of listed.webhooks ?? []) {
        const webhookId = id(webhook.id);
        if (webhookId && webhook.url === callbackUrl) await remove(client, webhookId);
      }
      const created = await client.request<{ webhook?: Webhook }>("/webhooks", {
        method: "POST",
        body: {
          webhook: {
            name: `w6w ${spec.title}`,
            url: callbackUrl,
            events,
            sources: ["admin", "api", "public", "system"],
            headers: [{ name: SECRET_HEADER, value: secret, is_signature: true }],
          },
        },
      });
      const webhookId = id(created.webhook?.id);
      if (!webhookId) throw new Error("ActiveCampaign created the webhook but returned no id.");
      return { webhookId, secret, events };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = id(state?.webhookId);
      if (webhookId) await remove(new ActiveCampaignClient(ctx), webhookId);
    },

    handleIngest({ raw, state }) {
      if (String(raw.method).toUpperCase() !== "POST") {
        throw new Error("ActiveCampaign delivers webhooks with POST.");
      }
      const secret = requireSecret(state?.secret);
      const got = header(raw, SECRET_HEADER);
      if (got === undefined || !timingSafeEqual(got, secret)) {
        throw new Error("ActiveCampaign delivery refused: the secret header is missing or wrong.");
      }
      const body = typeof raw.body === "string" ? parseForm(raw.body) : obj(raw.body);
      const type = text(body?.type);
      if (!body || !type) {
        throw new Error("Not an ActiveCampaign webhook delivery: expected a type.");
      }
      const registered = state?.events ?? (spec.event ? [spec.event] : []);
      if (!registered.includes(type)) return [];
      return [{
        type,
        dateTime: text(body.date_time),
        initiatedFrom: text(body.initiated_from),
        initiatedBy: text(body.initiated_by),
        contact: obj(body.contact),
        deal: obj(body.deal),
        campaign: obj(body.campaign),
        data: body,
      }];
    },
  };
}
