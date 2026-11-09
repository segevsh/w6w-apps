import type { OutputField, TriggerDefinition } from "@w6w/types";
import { PipedriveClient } from "./client.ts";

interface TriggerState {
  webhookId: string;
}

interface PipedriveWebhook {
  id?: string | number;
  subscription_url?: string;
}

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Deal ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "value", type: "number", label: "Value" },
  { key: "currency", type: "string", label: "Currency" },
];

function webhookId(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return undefined;
}

function isGone(error: unknown): boolean {
  return error instanceof Error && /Pipedrive (404|410)\b/.test(error.message);
}

async function deleteWebhook(client: PipedriveClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (!isGone(error)) throw error;
  }
}

/** Pipedrive V1 has no delivery signature; the per-subscription callback URL is the secret. */
export const newDeal: TriggerDefinition<
  Record<string, never>,
  Record<string, unknown>,
  TriggerState
> = {
  key: "new-deal",
  title: "New Deal",
  description: "Fires when a deal is created. The run gets the new deal.",
  output: OUTPUT,
  sample: { id: "42", title: "Renewal", value: 1200, currency: "USD" },

  async onSubscribe({ callbackUrl }, ctx) {
    const client = new PipedriveClient(ctx);
    const existing = await client.request<PipedriveWebhook[]>("/webhooks");
    for (const hook of existing.data ?? []) {
      const id = webhookId(hook.id);
      if (id && hook.subscription_url === callbackUrl) await deleteWebhook(client, id);
    }
    const created = await client.request<PipedriveWebhook>("/webhooks", {
      method: "POST",
      body: {
        subscription_url: callbackUrl,
        event_action: "create",
        event_object: "deal",
        name: "w6w New Deal",
        version: "2.0",
      },
    });
    const id = webhookId(created.data?.id);
    if (!id) throw new Error("Pipedrive created the webhook but returned no id.");
    return { webhookId: id };
  },

  async onUnsubscribe({ state }, ctx) {
    const id = webhookId(state?.webhookId);
    if (id) await deleteWebhook(new PipedriveClient(ctx), id);
  },

  handleIngest({ raw }) {
    const call = raw as { method?: unknown; body?: unknown };
    if (String(call.method).toUpperCase() !== "POST") {
      throw new Error("Pipedrive delivers webhooks with POST.");
    }
    const body = call.body as Record<string, unknown> | undefined;
    // Webhooks v2.0 delivers {meta, data, previous}; we register v2.0 explicitly.
    return [(body?.data ?? body ?? {}) as Record<string, unknown>];
  },
};
