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

function contentType(headers: Record<string, string>): string {
  return Object.entries(headers).find(([key]) => key.toLowerCase() === "content-type")?.[1] ?? "";
}

function multipartFields(body: string, type: string): Record<string, string> | undefined {
  const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(type)?.slice(1).find(Boolean);
  if (!boundary) return undefined;

  const fields: Record<string, string> = {};
  for (const part of body.split(`--${boundary}`).slice(1, -1)) {
    const [headers, value] = part.replace(/^\r?\n/, "").split(/\r?\n\r?\n/, 2);
    const name = /name="([^"]+)"/i.exec(headers)?.[1];
    if (name && value !== undefined) fields[name] = value.replace(/\r?\n$/, "");
  }
  return fields;
}

function parsedBody(body: unknown, headers: Record<string, string>): unknown {
  if (typeof body !== "string") return body;
  const type = contentType(headers);
  const parsed = type.includes("multipart/form-data")
    ? multipartFields(body, type)
    : type.includes("application/x-www-form-urlencoded")
    ? Object.fromEntries(new URLSearchParams(body))
    : body;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return parsed;
  const rawRequest = (parsed as Record<string, unknown>).rawRequest;
  if (typeof rawRequest !== "string") return parsed;
  try {
    return JSON.parse(rawRequest);
  } catch {
    return Object.fromEntries(new URLSearchParams(rawRequest));
  }
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
    const webhookId = String(
      Object.entries(created).find(([, url]) => url === callbackUrl)?.[0] ??
        created.id ?? created.webhookID ??
        "",
    );
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
    return items(parsedBody(raw.body, raw.headers));
  },
};

export default submissionWebhook;
