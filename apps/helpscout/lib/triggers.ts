import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { HelpScoutClient, HelpScoutError } from "./client.ts";

/**
 * Help Scout webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` generates a per-subscription secret (D5 (1) — Help Scout takes a
 *     caller-chosen `secret` at creation), deletes a leftover webhook that already points at the
 *     callback URL, and creates the webhook. The secret lives in the subscription state.
 *   - `onUnsubscribe` deletes that webhook; one Help Scout no longer has counts as deleted.
 *   - `handleIngest` verifies `X-HelpScout-Signature` — base64(HMAC-SHA1(secret, raw body)) —
 *     BEFORE it parses anything. Help Scout always signs, so there is no unsigned path. The
 *     scheme carries no timestamp, so there is no replay window to enforce.
 *
 * Source: https://developer.helpscout.com/mailbox-api/endpoints/webhooks/create/ and
 * https://developer.helpscout.com/webhooks/ (verified 2026-11-09).
 */

export interface TriggerParams {
  /** Comma-separated inbox ids; blank watches every inbox (conversation events only). */
  mailboxIds?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  event: string;
  secret: string;
}

/** The stored event: one verified delivery. */
export interface HelpScoutEvent {
  event: string;
  resourceId: string | null;
  resource: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "event", type: "string", label: "Event" },
  { key: "resourceId", type: "string", label: "Resource ID" },
  { key: "resource", type: "object", label: "Conversation or Customer" },
];

const MAILBOX_PARAM: Param = {
  key: "mailboxIds",
  label: "Inbox IDs",
  type: "string",
  hint: "Comma-separated inbox ids to watch. Leave blank for every inbox.",
};

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

function mailboxIdsOf(raw: string | undefined): number[] | undefined {
  const ids = (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return undefined;
  return ids.map((s) => {
    const n = Number(s);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`Inbox ID "${s}" is not a number.`);
    return n;
  });
}

async function deleteWebhook(client: HelpScoutClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof HelpScoutError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

interface WebhookList {
  _embedded?: { webhooks?: Array<{ id?: unknown; url?: unknown }> };
  page?: { totalPages?: number };
}

/** Ids of the account's webhooks that already deliver to `url`. */
async function webhooksPointingAt(client: HelpScoutClient, url: string): Promise<string[]> {
  const found: string[] = [];
  for (let page = 1; page <= MAX_WEBHOOK_PAGES; page++) {
    const res = await client.request<WebhookList>("/webhooks", { query: { page } });
    for (const w of res?._embedded?.webhooks ?? []) {
      const id = str(w.id);
      if (id && w.url === url) found.push(id);
    }
    if (page >= (res?.page?.totalPages ?? 1)) break;
  }
  return found;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  event: string;
  /** Conversation events can be narrowed to inboxes; customer events cannot. */
  mailboxFilter: boolean;
  sample: HelpScoutEvent;
}

/** Build one Help Scout webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, HelpScoutEvent, TriggerState> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.mailboxFilter ? [MAILBOX_PARAM] : [],
    output: EVENT_OUTPUT,
    sample: spec.sample,

    async onSubscribe({ params, subscriptionId, callbackUrl }, ctx) {
      const client = new HelpScoutClient(ctx);
      const mailboxIds = spec.mailboxFilter ? mailboxIdsOf(params?.mailboxIds) : undefined;
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const secret = randomSecret(20); // 40 hex characters — Help Scout's maximum
      const body: Record<string, unknown> = {
        url: callbackUrl,
        events: [spec.event],
        secret,
        payloadVersion: "V3",
        label: `w6w ${subscriptionId}`,
      };
      if (mailboxIds) body.mailboxIds = mailboxIds;
      const created = await client.create("/webhooks", body);
      // The id rides the Resource-ID header; fall back to the list if the header was not exposed.
      const webhookId = created.resourceId !== undefined && Number.isFinite(created.resourceId)
        ? String(created.resourceId)
        : (await webhooksPointingAt(client, callbackUrl))[0];
      if (!webhookId) throw new Error("Help Scout created the webhook but returned no id.");
      return { webhookId, event: spec.event, secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new HelpScoutClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Help Scout delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const secret = requireSecret(state?.secret);
      const signature = header(raw, "x-helpscout-signature");
      if (!signature) throw refused("the signature header is missing");
      const expected = await hmac("SHA-1", secret, body, "base64");
      if (!timingSafeEqual(expected, signature)) throw refused("the signature does not match");

      const event = header(raw, "x-helpscout-event");
      if (event !== undefined && event !== spec.event) return [];
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Help Scout delivery body is not valid JSON.");
      }
      const resource = asObject(parsed);
      if (!resource) return [];
      return [{ event: spec.event, resourceId: str(resource.id), resource }];
    },
  };
}
