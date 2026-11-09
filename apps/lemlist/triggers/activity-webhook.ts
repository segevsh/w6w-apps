import type { TriggerDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface WebhookState {
  webhookId: string;
  secret: string;
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function items(body: unknown): Record<string, unknown>[] {
  const values = Array.isArray(body) ? body : [body];
  const ids = new Set<string>();
  return values.filter((value): value is Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const id = String(value._id ?? value.id ?? "");
    if (!id || ids.has(id)) return false;
    ids.add(id);
    return true;
  });
}

async function remove(client: LemlistClient, id: string) {
  try {
    await client.request(`/hooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (/\b(404|410)\b/.test(String(error))) return;
    throw error;
  }
}

const activityWebhook: TriggerDefinition = {
  key: "activity-webhook",
  title: "New Activity (Webhook)",
  description: "The run gets each lemlist activity delivered to its private callback URL.",
  output: [{ key: "_id", type: "string", label: "Activity ID" }],
  sample: { _id: "activity_123", type: "emailsReplied" },
  async onSubscribe({ callbackUrl }, ctx) {
    const client = new LemlistClient(ctx);
    const listed = await client.request<
      { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
    >("/hooks");
    const hooks = Array.isArray(listed) ? listed : listed.data ?? [];
    for (const item of hooks) {
      if ((item.url === callbackUrl || item.targetUrl === callbackUrl) && item.id != null) {
        await remove(client, String(item.id));
      }
    }
    const secret = randomSecret();
    const created = await client.request<Record<string, unknown>>("/hooks", {
      method: "POST",
      body: { url: callbackUrl, secret },
    });
    const webhookId = String(created.id ?? created._id ?? "");
    if (!webhookId) throw new Error("lemlist created the webhook but returned no id.");
    return { webhookId, secret } satisfies WebhookState;
  },
  async onUnsubscribe({ state }, ctx) {
    const id = String((state as Partial<WebhookState> | undefined)?.webhookId ?? "");
    if (id) await remove(new LemlistClient(ctx), id);
  },
  handleIngest({ raw }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error("lemlist delivers webhooks with POST.");
    }
    return items(raw.body);
  },
};

export default activityWebhook;
