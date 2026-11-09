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

function sameSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string") return false;
  const actualBytes = new TextEncoder().encode(actual);
  const expectedBytes = new TextEncoder().encode(expected);
  let difference = actualBytes.length ^ expectedBytes.length;
  const length = Math.max(actualBytes.length, expectedBytes.length);
  for (let index = 0; index < length; index++) {
    difference |= (actualBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }
  return difference === 0;
}

function items(body: unknown, secret: string): Record<string, unknown>[] {
  const values = Array.isArray(body) ? body : [body];
  const ids = new Set<string>();
  const events: Record<string, unknown>[] = [];
  for (const value of values) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    if (!sameSecret(value.secret, secret)) {
      throw new Error("lemlist webhook secret did not match.");
    }
    const id = String(value._id ?? value.id ?? "");
    if (!id || ids.has(id)) continue;
    ids.add(id);
    const { secret: _secret, ...event } = value;
    events.push(event);
  }
  return events;
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
      const id = item._id ?? item.id;
      if ((item.url === callbackUrl || item.targetUrl === callbackUrl) && id != null) {
        await remove(client, String(id));
      }
    }
    const secret = randomSecret();
    const created = await client.request<Record<string, unknown>>("/hooks", {
      method: "POST",
      body: { targetUrl: callbackUrl, secret },
    });
    const webhookId = String(created.id ?? created._id ?? "");
    if (!webhookId) throw new Error("lemlist created the webhook but returned no id.");
    return { webhookId, secret } satisfies WebhookState;
  },
  async onUnsubscribe({ state }, ctx) {
    const id = String((state as Partial<WebhookState> | undefined)?.webhookId ?? "");
    if (id) await remove(new LemlistClient(ctx), id);
  },
  handleIngest({ raw, state }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error("lemlist delivers webhooks with POST.");
    }
    const secret = (state as Partial<WebhookState> | undefined)?.secret;
    if (!secret) throw new Error("lemlist webhook secret is missing.");
    return items(raw.body, secret);
  },
};

export default activityWebhook;
