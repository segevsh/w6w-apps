import type { OutputField, TriggerDefinition } from "@w6w/types";
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

/** ActiveCampaign's webhook API delivers POST form fields without a signature. */
export const newContact: TriggerDefinition<Record<string, never>, Record<string, unknown>, TriggerState> = {
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
    const body = call.body as Record<string, unknown> | undefined;
    return [(body?.contact ?? body ?? {}) as Record<string, unknown>];
  },
};
