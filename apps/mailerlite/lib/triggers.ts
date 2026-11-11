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

/** Every event MailerLite publishes (https://developers.mailerlite.com/docs/webhooks.html, 2026-11-10). */
export const EVENT_NAMES = [
  "subscriber.created",
  "subscriber.updated",
  "subscriber.unsubscribed",
  "subscriber.added_to_group",
  "subscriber.removed_from_group",
  "subscriber.bounced",
  "subscriber.automation_triggered",
  "subscriber.automation_completed",
  "subscriber.spam_reported",
  "subscriber.deleted",
  "subscriber.active",
  "campaign.sent",
  "campaign.click",
  "campaign.open",
];

/** Events MailerLite only delivers from a `batchable: true` webhook (payload `{ events: [...] }`). */
const BATCH_EVENTS = ["subscriber.deleted", "campaign.click", "campaign.open"];

/** The user's comma-separated event list (empty = every event) → validated names. */
export function chooseEvents(raw: unknown): string[] {
  const wanted = (typeof raw === "string" ? raw : "").split(",").map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (wanted.length === 0) return [...EVENT_NAMES];
  const bad = wanted.filter((e) => !EVENT_NAMES.includes(e));
  if (bad.length > 0) {
    throw new Error(
      `Unknown MailerLite event(s): ${bad.join(", ")}. Use ${EVENT_NAMES.join(", ")}.`,
    );
  }
  return [...new Set(wanted)];
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The one event this trigger subscribes to. Omit it for the Any-event trigger (`events` param). */
  event?: string;
  /** Adds an optional `groupId` param: only deliveries about that group fire (group events). */
  groupFilter?: boolean;
  sample: MailerLiteEvent;
}

interface TriggerParams {
  events?: string;
  groupId?: string;
}

/** Build one MailerLite webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, MailerLiteEvent, TriggerState> {
  const chosen = (params: TriggerParams | undefined) =>
    spec.event ? [spec.event] : chooseEvents(params?.events);
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [
      ...(spec.event ? [] : [{
        key: "events",
        label: "Events",
        type: "string" as const,
        hint: `Comma-separated MailerLite events to fire on: ${
          EVENT_NAMES.join(", ")
        }. Leave empty for all of them. campaign.open, campaign.click and subscriber.deleted are delivered batched.`,
      }]),
      ...(spec.groupFilter
        ? [{
          key: "groupId",
          label: "Group ID",
          type: "string" as const,
          hint: "Only fire for this group. Leave empty for every group.",
        }]
        : []),
    ],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ subscriptionId, callbackUrl, params }, ctx) {
      const events = chosen(params); // validated before any request
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
            events,
            url: callbackUrl,
            enabled: true,
            ...(events.some((e) => BATCH_EVENTS.includes(e)) ? { batchable: true } : {}),
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
      return { webhookId, event: events.join(","), secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new MailerLiteClient(ctx), webhookId);
    },

    async handleIngest({ raw, params, state }) {
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
      const top = asObject(parsed);
      if (!top) return [];
      const wanted = chosen(params);
      const groupId = spec.groupFilter ? str(params?.groupId) : null;
      // A batched webhook delivers `{ events: [{ type, subscriber, ... }], total }`.
      const items = Array.isArray(top.events) ? top.events : [top];
      const out: MailerLiteEvent[] = [];
      for (const item of items) {
        const resource = asObject(item);
        if (!resource) continue;
        const name = str(resource.event) ?? str(resource.type);
        // A named trigger keeps an unnamed body (as before); the Any-event trigger needs the name.
        if (spec.event ? name !== null && name !== spec.event : name === null) continue;
        if (!wanted.includes(name ?? spec.event ?? "")) continue;
        if (groupId && str(asObject(resource.group)?.id) !== groupId) continue;
        out.push({
          event: name ?? spec.event ?? "",
          resourceId: str(resource.id) ?? str(asObject(resource.subscriber)?.id) ??
            str(asObject(resource.campaign)?.id),
          resource,
        });
      }
      return out;
    },
  };
}
