import type { TriggerDefinition } from "@w6w/types";
import { JotformClient } from "../lib/client.ts";

interface WebhookState {
  webhookId: string;
  formId: string;
}

function items(body: unknown): Record<string, unknown>[] {
  const values = Array.isArray(body) ? body : [body];
  const ids = new Set<string>();
  return values.filter((value): value is Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const id = String(value.submissionID ?? value.id ?? "");
    if (!id || ids.has(id)) return false;
    ids.add(id);
    return true;
  });
}

async function remove(client: JotformClient, formId: string, id: string) {
  try {
    await client.content(`/form/${encodeURIComponent(formId)}/webhooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (/\b(404|410)\b/.test(String(error))) return;
    throw error;
  }
}

const submissionWebhook: TriggerDefinition = {
  key: "submission-webhook",
  title: "New Submission (Webhook)",
  description: "The run gets each Jotform submission delivered to its private callback URL.",
  params: [{ key: "formId", label: "Form ID", type: "string", required: true }],
  output: [{ key: "submissionID", type: "string", label: "Submission ID" }],
  sample: { submissionID: "submission_123", created_at: "2026-11-09 12:00:00" },
  async onSubscribe({ params, callbackUrl }, ctx) {
    const formId = String(params.formId ?? "").trim();
    if (!formId) throw new Error("A Jotform form ID is required.");
    const client = new JotformClient(ctx);
    const listed = await client.content<Record<string, unknown>>(
      `/form/${encodeURIComponent(formId)}/webhooks`,
    );
    for (const [id, url] of Object.entries(listed ?? {})) {
      if (url === callbackUrl) await remove(client, formId, id);
    }
    const created = await client.content<Record<string, unknown>>(
      `/form/${encodeURIComponent(formId)}/webhooks`,
      {
        method: "POST",
        form: { webhookURL: callbackUrl },
      },
    );
    const webhookId = String(created.id ?? created.webhookID ?? "");
    if (!webhookId) throw new Error("Jotform created the webhook but returned no id.");
    return { webhookId, formId } satisfies WebhookState;
  },
  async onUnsubscribe({ state }, ctx) {
    const saved = state as Partial<WebhookState> | undefined;
    if (saved?.webhookId && saved.formId) {
      await remove(new JotformClient(ctx), saved.formId, saved.webhookId);
    }
  },
  handleIngest({ raw }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error("Jotform delivers webhooks with POST.");
    }
    return items(raw.body);
  },
};

export default submissionWebhook;
