import type { OutputField, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { ZendeskClient, ZendeskError } from "./client.ts";

/**
 * Zendesk webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a Zendesk event-subscription webhook pointed at the host's
 *     `callbackUrl` (after deleting a leftover of an earlier attempt that carries the same URL),
 *     then reads the webhook's signing secret and keeps it in the subscription state.
 *   - `onUnsubscribe` deletes that webhook; one Zendesk no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Zendesk-Webhook-Signature` — base64(HMAC-SHA256(secret,
 *     timestamp + raw body)) with the timestamp from `X-Zendesk-Webhook-Signature-Timestamp` —
 *     BEFORE it parses anything. Zendesk signs every webhook it creates, so there is no unsigned
 *     path: a missing header, a stale timestamp or an unset secret refuses the delivery.
 *
 * Source: https://developer.zendesk.com/api-reference/webhooks/webhooks-api/webhooks/ and
 * https://developer.zendesk.com/documentation/webhooks/verifying/ (verified 2026-11-09).
 */

/** Event types the shipped triggers subscribe to (Zendesk "Ticket events"). */
export const EVENT_TYPES = {
  created: "zen:event-type:ticket.created",
  statusChanged: "zen:event-type:ticket.status_changed",
  commentAdded: "zen:event-type:ticket.comment_added",
} as const;
export type TicketEventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  eventType: string;
  /** The webhook's signing secret (GET /webhooks/{id}/signing_secret). */
  signingSecret: string;
}

/** The stored event: one verified delivery. */
export interface TicketEvent {
  eventId: string | null;
  type: string;
  time: string | null;
  accountId: string | null;
  ticketId: string | null;
  subject: string | null;
  detail: Record<string, unknown>;
  event: Record<string, unknown>;
}

export const TICKET_OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "type", type: "string", label: "Event Type" },
  { key: "time", type: "string", label: "Event Time" },
  { key: "accountId", type: "string", label: "Account ID" },
  { key: "ticketId", type: "string", label: "Ticket ID" },
  { key: "subject", type: "string", label: "Event Subject" },
  { key: "detail", type: "object", label: "Ticket" },
  { key: "event", type: "object", label: "Event Details" },
];

/** Signatures older or newer than this many seconds are refused (replay window). */
const TOLERANCE_SEC = 300;

/** Leftover webhooks `onSubscribe` will read looking for one carrying its callback URL. */
const LEFTOVER_PAGE_SIZE = 100;

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

const refused = (why: string) => new Error(`webhook delivery refused: ${why}`);

/** Epoch seconds of a Zendesk signature timestamp (ISO 8601, or bare epoch seconds). */
function timestampSeconds(ts: string): number {
  const ms = Date.parse(ts);
  if (Number.isFinite(ms)) return ms / 1000;
  return /^\d{9,11}$/.test(ts) ? Number(ts) : NaN;
}

async function deleteWebhook(client: ZendeskClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof ZendeskError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

/** Webhooks of this subscription (named after it) that already deliver to `endpoint`. */
async function leftoversFor(
  client: ZendeskClient,
  name: string,
  endpoint: string,
): Promise<string[]> {
  const res = await client.request<{ webhooks?: Array<{ id?: unknown; endpoint?: unknown }> }>(
    "/webhooks",
    { query: { "filter[name_contains]": name, "page[size]": LEFTOVER_PAGE_SIZE } },
  );
  const ids: string[] = [];
  for (const w of res?.webhooks ?? []) {
    const id = str(w.id);
    if (id && w.endpoint === endpoint) ids.push(id);
  }
  return ids;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  eventType: TicketEventType;
  sample: TicketEvent;
}

/** Build one Zendesk webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<Record<string, never>, TicketEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: TICKET_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ subscriptionId, callbackUrl }, ctx) {
      const client = new ZendeskClient(ctx);
      const name = `w6w ${subscriptionId}`;
      for (const id of await leftoversFor(client, name, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const created = await client.request<{ webhook?: { id?: unknown } }>("/webhooks", {
        method: "POST",
        body: {
          webhook: {
            name,
            status: "active",
            endpoint: callbackUrl,
            http_method: "POST",
            request_format: "json",
            subscriptions: [spec.eventType],
          },
        },
      });
      const webhookId = str(created?.webhook?.id);
      if (!webhookId) throw new Error("Zendesk created the webhook but returned no id.");
      let secret: string | null;
      try {
        const res = await client.request<{ signing_secret?: { secret?: unknown } }>(
          `/webhooks/${encodeURIComponent(webhookId)}/signing_secret`,
        );
        secret = str(res?.signing_secret?.secret);
      } catch (err) {
        await deleteWebhook(client, webhookId).catch(() => undefined);
        throw err;
      }
      if (!secret) {
        await deleteWebhook(client, webhookId).catch(() => undefined);
        throw new Error("Zendesk created the webhook but returned no signing secret.");
      }
      return { webhookId, eventType: spec.eventType, signingSecret: secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new ZendeskClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Zendesk delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const secret = requireSecret(state?.signingSecret);
      const signature = header(raw, "x-zendesk-webhook-signature");
      const timestamp = header(raw, "x-zendesk-webhook-signature-timestamp");
      if (!signature || !timestamp) throw refused("the signature headers are missing");
      if (!withinTolerance(timestampSeconds(timestamp), Date.now(), TOLERANCE_SEC)) {
        throw refused("the signature timestamp is outside the accepted window");
      }
      const expected = await hmac("SHA-256", secret, timestamp + body, "base64");
      if (!timingSafeEqual(expected, signature)) throw refused("the signature does not match");

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Zendesk delivery body is not valid JSON.");
      }
      const o = asObject(parsed);
      const type = str(o?.type);
      if (!o || !type) return [];
      if (type !== spec.eventType) return [];
      const detail = asObject(o.detail) ?? {};
      const subject = str(o.subject);
      return [{
        eventId: str(o.id),
        type,
        time: str(o.time),
        accountId: str(o.account_id),
        ticketId: str(detail.id) ?? subject?.match(/^zen:ticket:(.+)$/)?.[1] ?? null,
        subject,
        detail,
        event: asObject(o.event) ?? {},
      }];
    },
  };
}
