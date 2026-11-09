import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { WooCommerceClient } from "./client.ts";

/**
 * WooCommerce webhook triggers (https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks,
 * verified 2026-11-09).
 *
 *   - `onSubscribe` creates a webhook (`POST /wp-json/wc/v3/webhooks`) per topic pointed at the
 *     host's `callbackUrl`, with a random per-subscription secret that WooCommerce accepts at
 *     creation and signs with (D5 (1)). The secret and the webhook ids are kept in the
 *     subscription state. Webhooks already pointed at the callback URL are deleted first.
 *   - `onUnsubscribe` deletes the webhooks (`DELETE .../webhooks/<id>?force=true`); one that is
 *     already gone counts as deleted.
 *   - `handleIngest` verifies `X-WC-Webhook-Signature` (base64 HMAC-SHA256 of the raw body under
 *     the secret) over the exact bytes, before anything is parsed; a delivery that does not
 *     verify throws.
 *
 * The one unsigned request WooCommerce makes is the delivery-URL ping it sends when a webhook
 * is created or reactivated: a form body `webhook_id=<id>` with no WooCommerce headers at all
 * (its source builds that request without a signature). It is acknowledged with NO event and
 * only for that exact body, so nothing unsigned can reach a run. WooCommerce defines no signed
 * timestamp, so there is no replay window; each event carries `deliveryId`.
 */

export interface TriggerParams {
  /** Generic trigger only: comma-separated WooCommerce topics. */
  topics?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  webhookIds: string[];
  topics: string[];
  /** The per-subscription signing secret handed to WooCommerce at creation (D5 (1)). */
  secret: string;
}

/** The run's `trigger.event`: delivery metadata plus the payload WooCommerce sent. */
export interface WooEvent {
  topic: string;
  resource: string | null;
  event: string | null;
  webhookId: string | null;
  deliveryId: string | null;
  source: string | null;
  payload: Record<string, unknown>;
}

const TOPICS_PARAM: Param = {
  key: "topics",
  label: "Topics",
  type: "string",
  required: true,
  placeholder: "order.created, coupon.updated",
  hint:
    "Comma-separated WooCommerce webhook topics, e.g. order.created. Core topics: coupon, customer, order and product with .created, .updated or .deleted; a custom action.<hook_name> topic also works.",
};

const EVENT_OUTPUT: OutputField[] = [
  { key: "topic", type: "string", label: "Topic" },
  { key: "resource", type: "string", label: "Resource" },
  { key: "event", type: "string", label: "Event" },
  { key: "webhookId", type: "string", label: "Webhook ID" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "source", type: "string", label: "Store URL" },
  { key: "payload", type: "object", label: "Payload" },
];

/** The creation ping: WooCommerce posts exactly this form body, unsigned. */
const PING_BODY = /^webhook_id=(\d{1,12})$/;

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** Split the generic trigger's comma-separated topic list. */
export function parseTopicList(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => s !== ""))];
}

/** Delete one webhook. One WooCommerce no longer has is already what we wanted. */
async function deleteWebhook(client: WooCommerceClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
      query: { force: "true" },
    });
  } catch (err) {
    if (err instanceof Error && /^WooCommerce (404|410) /.test(err.message)) return;
    throw err;
  }
}

const PER_PAGE = 100;
const MAX_PAGES = 10;

/** Ids of the store's webhooks that already deliver to `url`. */
async function webhooksPointingAt(client: WooCommerceClient, url: string): Promise<string[]> {
  const found: string[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const rows = await client.request<Array<{ id?: unknown; delivery_url?: unknown }>>(
      "/webhooks",
      { query: { per_page: PER_PAGE, page } },
    );
    for (const row of rows ?? []) {
      const id = str(row.id);
      if (id && row.delivery_url === url) found.push(id);
    }
    if ((rows ?? []).length < PER_PAGE) break;
  }
  return found;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The topics this trigger fires on; omitted for the trigger whose topics are a param. */
  topics?: string[];
  /** A representative payload for the sample. */
  samplePayload?: Record<string, unknown>;
}

/** Build one WooCommerce webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, WooEvent, TriggerState> {
  const fixed = spec.topics;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [] : [TOPICS_PARAM],
    output: EVENT_OUTPUT,
    sample: {
      topic: fixed?.[0] ?? "order.created",
      resource: (fixed?.[0] ?? "order.created").split(".")[0],
      event: (fixed?.[0] ?? "order.created").split(".")[1] ?? null,
      webhookId: "142",
      deliveryId: "a3b0c4d5e6f708192a3b4c5d6e7f8091",
      source: "https://shop.example.com/",
      payload: spec.samplePayload ?? { id: 727, status: "processing", total: "29.99" },
    } satisfies WooEvent,

    async onSubscribe({ params, callbackUrl }, ctx) {
      const topics = fixed ?? parseTopicList(params.topics);
      if (topics.length === 0) throw new Error("Choose at least one WooCommerce topic.");
      const client = WooCommerceClient.fromConnection(ctx);
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const secret = randomSecret();
      const webhookIds: string[] = [];
      try {
        for (const topic of topics) {
          const created = await client.request<{ id?: unknown }>("/webhooks", {
            method: "POST",
            body: {
              name: `w6w ${topic}`,
              topic,
              delivery_url: callbackUrl,
              secret,
              status: "active",
            },
          });
          const id = str(created?.id);
          if (!id) {
            throw new Error(`WooCommerce created the "${topic}" webhook but returned no id.`);
          }
          webhookIds.push(id);
        }
      } catch (err) {
        // Do not leave half a subscription behind: the host never learns these ids.
        for (const id of webhookIds) await deleteWebhook(client, id).catch(() => undefined);
        throw err;
      }
      return { webhookId: webhookIds[0], webhookIds, topics, secret };
    },

    async onUnsubscribe({ state }, ctx) {
      const s = state as Partial<TriggerState> | undefined;
      const ids = s?.webhookIds?.length ? s.webhookIds : s?.webhookId ? [s.webhookId] : [];
      if (ids.length === 0) return;
      const client = WooCommerceClient.fromConnection(ctx);
      for (const id of ids) await deleteWebhook(client, id);
    },

    async handleIngest({ raw, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`WooCommerce delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const given = header(raw, "x-wc-webhook-signature");

      // The creation ping: the exact unsigned form body, no WooCommerce headers, no event.
      const ping = PING_BODY.exec(body);
      if (ping && given === undefined && header(raw, "x-wc-webhook-topic") === undefined) {
        const known = state?.webhookIds ?? (state?.webhookId ? [state.webhookId] : []);
        // `state` is absent when the ping beats onSubscribe's own return; else it must be ours.
        if (known.length > 0 && !known.includes(ping[1])) {
          throw new Error("WooCommerce ping refused: it is for a different webhook.");
        }
        return [];
      }

      const secret = requireSecret(state?.secret);
      if (given === undefined || given === "") {
        throw new Error(
          "WooCommerce delivery refused: the X-WC-Webhook-Signature header is missing.",
        );
      }
      const expected = await hmac("SHA-256", secret, body, "base64");
      if (!timingSafeEqual(expected, given.trim())) {
        throw new Error("WooCommerce delivery refused: the signature does not match.");
      }

      const topic = str(header(raw, "x-wc-webhook-topic"));
      if (!topic) throw new Error("WooCommerce delivery has no X-WC-Webhook-Topic header.");
      const webhookId = str(header(raw, "x-wc-webhook-id"));
      const known = state?.webhookIds ?? (state?.webhookId ? [state.webhookId] : []);
      if (!webhookId || (known.length > 0 && !known.includes(webhookId))) {
        throw new Error("WooCommerce delivery refused: it is for a different webhook.");
      }
      let payload: Record<string, unknown> | null;
      try {
        payload = asObject(JSON.parse(body));
      } catch {
        payload = null;
      }
      if (!payload) throw new Error("WooCommerce delivery body is not a JSON object.");
      const wanted = state?.topics ?? [];
      if (wanted.length > 0 && !wanted.includes(topic)) return [];
      return [{
        topic,
        resource: str(header(raw, "x-wc-webhook-resource")),
        event: str(header(raw, "x-wc-webhook-event")),
        webhookId,
        deliveryId: str(header(raw, "x-wc-webhook-delivery-id")),
        source: str(header(raw, "x-wc-webhook-source")),
        payload,
      }];
    },
  };
}
