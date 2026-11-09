import type { OutputField, TriggerDefinition } from "@w6w/types";
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
export const newListEntry: TriggerDefinition<Record<string, never>, Record<string, unknown>, TriggerState> = {
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
