import type { TriggerDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

interface WebhookState {
  webhookId: string;
}

function asItems(body: unknown): Record<string, unknown>[] {
  const value = Array.isArray(body) ? body : [body];
  const seen = new Set<string>();
  return value.filter((item): item is Record<string, unknown> => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const id = String(item.id ?? "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function remove(client: GumroadClient, id: string) {
  try {
    await client.call("DELETE", `/resource_subscriptions/${seg(id)}`);
  } catch (error) {
    if (/\b(404|410)\b/.test(String(error))) return;
    throw error;
  }
}

const saleWebhook: TriggerDefinition = {
  key: "sale-webhook",
  title: "New Sale (Webhook)",
  description: "The run gets each Gumroad sale delivered to this private callback URL.",
  output: [{ key: "id", type: "string", label: "Sale ID" }],
  sample: { id: "sale_123", email: "buyer@example.test" },
  async onSubscribe({ callbackUrl }, ctx) {
    const client = new GumroadClient(ctx);
    const listed = await client.call("GET", "/resource_subscriptions", {
      query: { resource_name: "sale" },
    });
    for (
      const item of (listed.resource_subscriptions as Array<Record<string, unknown>> | undefined) ??
        []
    ) {
      if (item.post_url === callbackUrl && item.id != null) await remove(client, String(item.id));
    }
    const created = await client.call("PUT", "/resource_subscriptions", {
      form: { resource_name: "sale", post_url: callbackUrl },
    });
    const webhookId = String(
      (created.resource_subscription as Record<string, unknown> | undefined)?.id ?? "",
    );
    if (!webhookId) {
      throw new Error("Gumroad created the resource subscription but returned no id.");
    }
    return { webhookId } satisfies WebhookState;
  },
  async onUnsubscribe({ state }, ctx) {
    const id = String((state as Partial<WebhookState> | undefined)?.webhookId ?? "");
    if (id) await remove(new GumroadClient(ctx), id);
  },
  handleIngest({ raw }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error("Gumroad delivers webhooks with POST.");
    }
    return asItems(raw.body);
  },
};

export default saleWebhook;
