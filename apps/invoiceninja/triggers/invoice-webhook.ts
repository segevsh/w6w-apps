import type { TriggerDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface WebhookState {
  webhookId: string;
}

function items(body: unknown): Record<string, unknown>[] {
  const values = Array.isArray(body) ? body : [body];
  const ids = new Set<string>();
  return values.filter((value): value is Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const id = String(value.id ?? value.event_id ?? "");
    if (!id || ids.has(id)) return false;
    ids.add(id);
    return true;
  });
}

async function remove(client: InvoiceNinjaClient, id: string) {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (/\b(404|410)\b/.test(String(error))) return;
    throw error;
  }
}

const invoiceWebhook: TriggerDefinition = {
  key: "invoice-webhook",
  title: "Invoice Event (Webhook)",
  description:
    "The run gets each selected Invoice Ninja event delivered to its private callback URL.",
  params: [{ key: "eventId", label: "Webhook Event ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Event ID" }],
  sample: { id: "event_123", entity: "invoice" },
  async onSubscribe({ params, callbackUrl }, ctx) {
    const client = new InvoiceNinjaClient(ctx);
    const listed = await client.request<{ data?: Array<Record<string, unknown>> }>("/webhooks");
    for (const item of listed.data ?? []) {
      if (item.target_url === callbackUrl && item.id != null) await remove(client, String(item.id));
    }
    const created = await client.request<Record<string, unknown>>("/webhooks", {
      method: "POST",
      body: { event_id: params.eventId, target_url: callbackUrl, format: "JSON" },
    });
    const webhookId = String(created.id ?? "");
    if (!webhookId) throw new Error("Invoice Ninja created the webhook but returned no id.");
    return { webhookId } satisfies WebhookState;
  },
  async onUnsubscribe({ state }, ctx) {
    const id = String((state as Partial<WebhookState> | undefined)?.webhookId ?? "");
    if (id) await remove(new InvoiceNinjaClient(ctx), id);
  },
  handleIngest({ raw }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error("Invoice Ninja delivers webhooks with POST.");
    }
    return items(raw.body);
  },
};

export default invoiceWebhook;
