import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { BrevoClient } from "./client.ts";

interface TriggerState {
  webhookId: string;
}

interface Webhook {
  id?: string | number;
  url?: string;
}

const output: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "email", type: "string", label: "Email" },
  { key: "list_id", type: "array", label: "List IDs" },
  { key: "date", type: "string", label: "Event date" },
  { key: "ts", type: "number", label: "Event timestamp" },
];

function id(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
}

function gone(error: unknown): boolean {
  return error instanceof Error && /Brevo (404|410)\b/.test(error.message);
}

async function remove(client: BrevoClient, webhookId: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(webhookId)}`, { method: "DELETE" });
  } catch (error) {
    if (!gone(error)) throw error;
  }
}

function list(value: unknown): Webhook[] {
  if (Array.isArray(value)) return value as Webhook[];
  const body = value as { webhooks?: unknown };
  return Array.isArray(body?.webhooks) ? body.webhooks as Webhook[] : [];
}

/** Brevo can attach caller-chosen auth but does not sign deliveries; the callback URL is the secret. */
export const newContact: TriggerDefinition<
  Record<string, never>,
  Record<string, unknown>,
  TriggerState
> = {
  key: "new-contact",
  title: "New Contact",
  description: "Fires when a contact is added to a Brevo list. The run gets the contact event.",
  output,
  sample: {
    id: 1,
    email: "ada@example.com",
    event: "list_addition",
    key: "xxxxxxxx",
    list_id: [8],
    date: "2026-11-09 10:00:00",
    ts: 1794218400,
    api_key_name: "w6w",
  },

  async onSubscribe({ callbackUrl }, ctx) {
    const client = new BrevoClient(ctx);
    for (const webhook of list(await client.request("/webhooks"))) {
      const webhookId = id(webhook.id);
      if (webhookId && webhook.url === callbackUrl) await remove(client, webhookId);
    }
    const created = await client.request<Webhook>("/webhooks", {
      method: "POST",
      body: {
        url: callbackUrl,
        description: "w6w New Contact",
        events: ["listAddition"],
        type: "marketing",
      },
    });
    const webhookId = id(created?.id);
    if (!webhookId) throw new Error("Brevo created the webhook but returned no id.");
    return { webhookId };
  },

  async onUnsubscribe({ state }, ctx) {
    const webhookId = id(state?.webhookId);
    if (webhookId) await remove(new BrevoClient(ctx), webhookId);
  },

  handleIngest({ raw }) {
    const call = raw as { method?: unknown; body?: unknown };
    if (String(call.method).toUpperCase() !== "POST") {
      throw new Error("Brevo delivers webhooks with POST.");
    }
    return [(call.body ?? {}) as Record<string, unknown>];
  },
};

export type BrevoWebhookType = "transactional" | "marketing" | "inbound";

/**
 * Event names Brevo's "Create a webhook" accepts per webhook type
 * (https://developers.brevo.com/reference/create-webhook, read 2026-11-10).
 */
export const BREVO_EVENTS: Record<BrevoWebhookType, readonly string[]> = {
  transactional: [
    "sent",
    "request",
    "delivered",
    "hardBounce",
    "softBounce",
    "blocked",
    "spam",
    "invalid",
    "deferred",
    "click",
    "opened",
    "uniqueOpened",
    "unsubscribed",
  ],
  marketing: [
    "spam",
    "opened",
    "click",
    "hardBounce",
    "softBounce",
    "unsubscribed",
    "listAddition",
    "delivered",
    "contactUpdated",
    "contactDeleted",
  ],
  inbound: ["inboundEmailProcessed"],
};

export interface SignedState {
  webhookId: string;
  /** The bearer token Brevo is told to send with every delivery (caller-chosen, §6 D5 (1)). */
  secret: string;
}

export interface BrevoWebhookParams {
  type?: string;
  events?: string;
  domain?: string;
}

/** Brevo adds an "Internal key" field to contact events; it is never forwarded into a run. */
function clean(item: unknown): Record<string, unknown> {
  const o = item !== null && typeof item === "object" && !Array.isArray(item)
    ? { ...(item as Record<string, unknown>) }
    : {};
  delete o.key;
  return o;
}

export interface BrevoWebhookSpec {
  key: string;
  title: string;
  description: string;
  /** Fixed registration; omit for the Any-event trigger (taken from the params). */
  type?: BrevoWebhookType;
  events?: string[];
  /** Ask for the inbound domain (required by Brevo for `inbound`). */
  domainParam?: boolean;
  output: OutputField[];
  sample: Record<string, unknown>;
}

function resolveRegistration(
  spec: BrevoWebhookSpec,
  params: BrevoWebhookParams,
): { type: BrevoWebhookType; events: string[]; domain?: string } {
  if (spec.type) {
    const domain = params.domain?.trim();
    if (spec.domainParam && !domain) throw new Error("Set the inbound Domain to watch.");
    return { type: spec.type, events: spec.events!, ...(spec.domainParam ? { domain } : {}) };
  }
  const type = (params.type?.trim() || "transactional") as BrevoWebhookType;
  if (!(type in BREVO_EVENTS)) {
    throw new Error("Type must be transactional, marketing or inbound.");
  }
  const named = [
    ...new Set((params.events ?? "").split(",").map((s) => s.trim()).filter((s) => s !== "")),
  ];
  const catalog = BREVO_EVENTS[type];
  const bad = named.filter((n) => !catalog.includes(n));
  if (bad.length > 0) {
    throw new Error(
      `Not a Brevo ${type} event: ${bad.join(", ")}. Allowed: ${catalog.join(", ")}.`,
    );
  }
  const domain = params.domain?.trim();
  if (type === "inbound" && !domain) throw new Error("Set the inbound Domain to watch.");
  return {
    type,
    events: named.length > 0 ? named : [...catalog],
    ...(type === "inbound" ? { domain } : {}),
  };
}

/**
 * A Brevo webhook trigger registered through the API with a caller-chosen bearer token
 * (`auth: { type: "bearer", token }`, https://developers.brevo.com/docs/secured-webhooks). Brevo
 * publishes no body signature, so the token is the secret: `onSubscribe` mints it with
 * `randomSecret()`, keeps it in the subscription state, and `handleIngest` refuses any delivery
 * whose `Authorization` header is not `Bearer <token>` (constant-time compare, fail closed). The
 * inbound-parse payload `{ items: [...] }` becomes one event per item.
 */
export function brevoWebhook(
  spec: BrevoWebhookSpec,
): TriggerDefinition<BrevoWebhookParams, Record<string, unknown>, SignedState> {
  const params: Param[] = [];
  if (!spec.type) {
    params.push({
      key: "type",
      label: "Webhook type",
      type: "select",
      options: [
        { value: "transactional", label: "Transactional email" },
        { value: "marketing", label: "Marketing" },
        { value: "inbound", label: "Inbound parsing" },
      ],
      default: "transactional",
    });
    params.push({
      key: "events",
      label: "Events",
      type: "string",
      hint:
        "Comma-separated Brevo event names for the chosen type, e.g. delivered,opened,click. Leave empty for every event of that type.",
    });
  }
  if (spec.domainParam || !spec.type) {
    params.push({
      key: "domain",
      label: "Inbound domain",
      type: "string",
      required: spec.domainParam === true,
      hint: "Only for inbound parsing: the domain you set up in Brevo's Inbound parsing.",
    });
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params,
    output: spec.output,
    sample: spec.sample,

    async onSubscribe({ params: p, callbackUrl }, ctx) {
      const reg = resolveRegistration(spec, p);
      const client = new BrevoClient(ctx);
      for (const webhook of list(await client.request("/webhooks"))) {
        const webhookId = id(webhook.id);
        if (webhookId && webhook.url === callbackUrl) await remove(client, webhookId);
      }
      const secret = randomSecret();
      const created = await client.request<Webhook>("/webhooks", {
        method: "POST",
        body: {
          url: callbackUrl,
          description: `w6w ${spec.title}`,
          events: reg.events,
          type: reg.type,
          ...(reg.domain ? { domain: reg.domain } : {}),
          auth: { type: "bearer", token: secret },
        },
      });
      const webhookId = id(created?.id);
      if (!webhookId) throw new Error("Brevo created the webhook but returned no id.");
      return { webhookId, secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = id(state?.webhookId);
      if (webhookId) await remove(new BrevoClient(ctx), webhookId);
    },

    handleIngest({ raw, state }) {
      const secret = requireSecret(state?.secret);
      const body = requireRawBody(raw);
      const given = header(raw, "authorization");
      if (typeof given !== "string" || given === "") {
        throw new Error("Brevo delivery refused: the Authorization header is missing.");
      }
      if (!timingSafeEqual(given, `Bearer ${secret}`)) {
        throw new Error("Brevo delivery refused: the bearer token does not match.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Brevo delivery refused: the body is not JSON.");
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Not a Brevo webhook delivery: expected a JSON object.");
      }
      const items = (parsed as { items?: unknown }).items;
      if (spec.type === "inbound" || Array.isArray(items)) {
        return (Array.isArray(items) ? items : []).map(clean);
      }
      return [clean(parsed)];
    },
  };
}
