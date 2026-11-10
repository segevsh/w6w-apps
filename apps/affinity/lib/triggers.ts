import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { AffinityClient } from "./client.ts";

interface TriggerState {
  webhookId: string;
}

interface Webhook {
  id?: string | number;
  webhook_url?: string;
}

const output: OutputField[] = [
  { key: "type", type: "string", label: "Event type" },
  { key: "body", type: "object", label: "Changed record" },
];

function id(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
}

function gone(error: unknown): boolean {
  return error instanceof Error && /Affinity (404|410)\b/.test(error.message);
}

async function remove(client: AffinityClient, webhookId: string): Promise<void> {
  try {
    await client.delete(`/webhook/${encodeURIComponent(webhookId)}`);
  } catch (error) {
    if (!gone(error)) throw error;
  }
}

/** Affinity V1 sends unsigned deliveries; the host-issued callback URL is the secret. */
export const newListEntry: TriggerDefinition<
  Record<string, never>,
  Record<string, unknown>,
  TriggerState
> = {
  key: "new-list-entry",
  title: "New List Entry",
  description: "Fires when an entry is added to an Affinity list. The run gets the changed record.",
  output,
  sample: { type: "list_entry.created", body: { id: 388, list_id: 26, entity_id: 38706 } },

  async onSubscribe({ callbackUrl }, ctx) {
    const client = new AffinityClient(ctx);
    const existing = await client.json<Webhook[]>("/webhook");
    for (const webhook of existing ?? []) {
      const webhookId = id(webhook.id);
      if (webhookId && webhook.webhook_url === callbackUrl) await remove(client, webhookId);
    }
    const created = await client.json<Webhook>("/webhook/subscribe", {
      method: "POST",
      body: { webhook_url: callbackUrl, subscriptions: ["list_entry.created"] },
    });
    const webhookId = id(created?.id);
    if (!webhookId) throw new Error("Affinity created the webhook but returned no id.");
    return { webhookId };
  },

  async onUnsubscribe({ state }, ctx) {
    const webhookId = id(state?.webhookId);
    if (webhookId) await remove(new AffinityClient(ctx), webhookId);
  },

  handleIngest({ raw }) {
    const call = raw as { method?: unknown; body?: unknown };
    if (String(call.method).toUpperCase() !== "POST") {
      throw new Error("Affinity delivers webhooks with POST.");
    }
    return [(call.body ?? {}) as Record<string, unknown>];
  },
};

/**
 * Every event in "Supported Webhook Events" (api-docs.affinity.co, read 2026-11-10). Affinity
 * documents: "An empty array indicates subscription to all webhook events."
 */
export const AFFINITY_EVENTS = [
  "list.created",
  "list.updated",
  "list.deleted",
  "list_entry.created",
  "list_entry.deleted",
  "note.created",
  "note.updated",
  "note.deleted",
  "field.created",
  "field.updated",
  "field.deleted",
  "field_value.created",
  "field_value.updated",
  "field_value.deleted",
  "person.created",
  "person.updated",
  "person.deleted",
  "organization.created",
  "organization.updated",
  "organization.deleted",
  "organization.merged",
  "opportunity.created",
  "opportunity.updated",
  "opportunity.deleted",
  "file.created",
  "file.deleted",
  "reminder.created",
  "reminder.updated",
  "reminder.deleted",
] as const;

const eventOutput: OutputField[] = [
  ...output,
  { key: "sent_at", type: "number", label: "Sent at (Unix seconds)" },
];

/** Parse the comma-separated `events` param; unknown names fail loudly instead of being ignored. */
export function parseEvents(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === "") return [];
  const names = (Array.isArray(raw) ? raw : String(raw).split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  const known = new Set<string>(AFFINITY_EVENTS);
  const unknown = names.filter((name) => !known.has(name));
  if (unknown.length) {
    throw new Error(
      `Unknown Affinity event(s): ${unknown.join(", ")}. Use names such as person.created.`,
    );
  }
  return [...new Set(names)];
}

/** Replace any registration of this callback URL, then register `subscriptions` (`[]` = all). */
async function register(
  callbackUrl: string,
  subscriptions: string[],
  ctx: HookContext,
): Promise<TriggerState> {
  const client = new AffinityClient(ctx);
  const existing = await client.json<Webhook[]>("/webhook");
  for (const webhook of existing ?? []) {
    const webhookId = id(webhook.id);
    if (webhookId && webhook.webhook_url === callbackUrl) await remove(client, webhookId);
  }
  const created = await client.json<Webhook>("/webhook/subscribe", {
    method: "POST",
    body: { webhook_url: callbackUrl, subscriptions },
  });
  const webhookId = id(created?.id);
  if (!webhookId) throw new Error("Affinity created the webhook but returned no id.");
  return { webhookId };
}

function acceptedBody(raw: unknown): Record<string, unknown> {
  const call = raw as { method?: unknown; body?: unknown };
  if (String(call.method).toUpperCase() !== "POST") {
    throw new Error("Affinity delivers webhooks with POST.");
  }
  const body = call.body;
  return body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
}

/**
 * One named trigger per Affinity event. Affinity V1 does not sign deliveries (the docs describe no
 * signature header), so the host-issued callback URL is the secret. Affinity allows three
 * webhook subscriptions per instance, so each trigger registers exactly its own event.
 */
export function eventTrigger(spec: {
  key: string;
  title: string;
  event: (typeof AFFINITY_EVENTS)[number];
  noun: string;
  sampleBody: Record<string, unknown>;
}): TriggerDefinition<Record<string, never>, Record<string, unknown>, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: `Fires on Affinity's ${spec.event} event. The run gets the changed ${spec.noun}.`,
    output: eventOutput,
    sample: { type: spec.event, body: spec.sampleBody, sent_at: 1631120151 },
    onSubscribe: ({ callbackUrl }, ctx) => register(callbackUrl, [spec.event], ctx),
    async onUnsubscribe({ state }, ctx) {
      const webhookId = id(state?.webhookId);
      if (webhookId) await remove(new AffinityClient(ctx), webhookId);
    },
    handleIngest({ raw }) {
      const body = acceptedBody(raw);
      return body.type === spec.event ? [body] : [];
    },
  };
}

/** The long tail: any Affinity event, optionally narrowed to a comma-separated list. */
export const anyEvent: TriggerDefinition<
  { events?: string },
  Record<string, unknown>,
  TriggerState
> = {
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Affinity webhook event, or only the listed ones. The run gets the event type and the changed record.",
  params: [{
    key: "events",
    label: "Events",
    type: "string",
    hint:
      "Comma-separated Affinity events, e.g. person.created,file.created. Leave empty for every event.",
  }],
  output: eventOutput,
  sample: { type: "file.created", body: { id: 12, entity_id: 38706 }, sent_at: 1631120151 },
  onSubscribe: ({ params, callbackUrl }, ctx) =>
    register(callbackUrl, parseEvents(params?.events), ctx),
  async onUnsubscribe({ state }, ctx) {
    const webhookId = id(state?.webhookId);
    if (webhookId) await remove(new AffinityClient(ctx), webhookId);
  },
  handleIngest({ raw, params }) {
    const body = acceptedBody(raw);
    const wanted = parseEvents(params?.events);
    if (wanted.length && !wanted.includes(String(body.type))) return [];
    return [body];
  },
};
