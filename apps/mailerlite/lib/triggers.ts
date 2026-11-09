import type { OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { MailerLiteClient, MailerLiteError } from "./client.ts";

/**
 * MailerLite webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a webhook pointed at the host's `callbackUrl` (after deleting a
 *     leftover that already carries the URL). MailerLite generates the signing secret and
 *     returns it on creation (`data.secret`); it is kept in the subscription state.
 *   - `onUnsubscribe` deletes that webhook; one MailerLite no longer has counts as deleted.
 *   - `handleIngest` verifies the `Signature` header — lowercase hex HMAC-SHA256 of the raw
 *     request body under the webhook's secret — BEFORE it parses anything. MailerLite always
 *     signs, so there is no unsigned path. The scheme carries no timestamp, so there is no
 *     replay window to enforce; MailerLite retries a failed delivery up to three more times, so
 *     the same event can arrive again (the server does not dedupe: `resource.id` plus
 *     `resource.updated_at` identify a repeat).
 *
 * Source: https://developers.mailerlite.com/docs/webhooks.html (verified 2026-11-09).
 */

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  event: string;
  secret: string;
}

/** The stored event: one verified delivery. */
export interface MailerLiteEvent {
  event: string;
  resourceId: string | null;
  resource: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "resourceId", type: "string", label: "Subscriber or Campaign ID" },
  { key: "resource", type: "object", label: "Subscriber or Campaign" },
];

/** Most pages of existing webhooks `onSubscribe` reads looking for a leftover. */
const MAX_WEBHOOK_PAGES = 20;

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

const refused = (why: string) => new Error(`webhook delivery refused: ${why}`);

async function deleteWebhook(client: MailerLiteClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof MailerLiteError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

interface WebhookList {
  data?: Array<{ id?: unknown; url?: unknown }>;
  meta?: { last_page?: number };
}

/** Ids of the account's webhooks that already deliver to `url`. */
async function webhooksPointingAt(client: MailerLiteClient, url: string): Promise<string[]> {
  const found: string[] = [];
  for (let page = 1; page <= MAX_WEBHOOK_PAGES; page++) {
    const res = await client.request<WebhookList>("/webhooks", { query: { page } });
    for (const w of res?.data ?? []) {
      const id = str(w.id);
      if (id && w.url === url) found.push(id);
    }
    if (page >= (res?.meta?.last_page ?? 1)) break;
  }
  return found;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  event: string;
  sample: MailerLiteEvent;
}

/** Build one MailerLite webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, MailerLiteEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ subscriptionId, callbackUrl }, ctx) {
      const client = new MailerLiteClient(ctx);
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const created = await client.request<{ data?: { id?: unknown; secret?: unknown } }>(
        "/webhooks",
        {
          method: "POST",
          body: {
            name: `w6w ${subscriptionId}`,
            events: [spec.event],
            url: callbackUrl,
            enabled: true,
          },
        },
      );
      const webhookId = str(created?.data?.id);
      const secret = str(created?.data?.secret);
      if (!webhookId) throw new Error("MailerLite created the webhook but returned no id.");
      if (!secret) {
        await deleteWebhook(client, webhookId).catch(() => undefined);
        throw new Error("MailerLite created the webhook but returned no signing secret.");
      }
      return { webhookId, event: spec.event, secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new MailerLiteClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`MailerLite delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const secret = requireSecret(state?.secret);
      const signature = header(raw, "signature");
      if (!signature) throw refused("the signature header is missing");
      const expected = await hmac("SHA-256", secret, body, "hex");
      if (!timingSafeEqual(expected, signature.toLowerCase())) {
        throw refused("the signature does not match");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("MailerLite delivery body is not valid JSON.");
      }
      const resource = asObject(parsed);
      if (!resource) return [];
      const name = str(resource.event) ?? str(resource.type);
      if (name !== null && name !== spec.event) return [];
      return [{ event: spec.event, resourceId: str(resource.id), resource }];
    },
  };
}
