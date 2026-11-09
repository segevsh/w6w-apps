import type { OutputField, TriggerDefinition } from "@w6w/types";
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
  { key: "contact_id", type: "number", label: "Contact ID" },
  { key: "date", type: "string", label: "Event date" },
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
    event: "listAddition",
    email: "ada@example.com",
    contact_id: 42,
    date: "2026-11-09 10:00:00",
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
