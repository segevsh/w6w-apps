import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { API_VERSION, shopFromConnection, ShopifyClient } from "./client.ts";

/**
 * Shopify webhook triggers (https://shopify.dev/docs/apps/build/webhooks, verified 2026-11-09).
 *
 *   - `onSubscribe` registers a webhook subscription (`POST /webhooks.json`, topic + address,
 *     JSON format) pointed at the host's `callbackUrl`, after deleting any subscription already
 *     pointed there: the URL is unique to the trigger subscription, so one carrying it is a
 *     leftover of an attempt that never recorded its id.
 *   - `onUnsubscribe` deletes that subscription; one Shopify no longer has counts as deleted.
 *   - `handleIngest` verifies `X-Shopify-Hmac-Sha256` (base64 HMAC-SHA256 of the raw body) under
 *     the APP'S CLIENT SECRET. Shopify signs with that secret, which is not part of the
 *     connection's access token, so it is a secret trigger parameter the user pastes (D5 (2)).
 *     The check runs over the exact bytes, before anything is parsed; a delivery that does not
 *     verify throws.
 *
 * Shopify defines no signed timestamp, so there is no replay window to enforce; every event
 * carries `webhookId` (`X-Shopify-Webhook-Id`), Shopify's own key for skipping a duplicate.
 */

export interface TriggerParams {
  /** The app's client secret ("API secret key" of a custom app): Shopify signs deliveries with it. */
  signingSecret?: string;
  /** Generic trigger only: comma-separated webhook topics. */
  topics?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  topics: string[];
  /** The store handle the subscription was created on (`acme` for `acme.myshopify.com`). */
  shop: string;
  /** The webhook ids created, one per topic (the first is `webhookId`). */
  webhookIds: string[];
}

/** The run's `trigger.event`: delivery metadata plus the resource Shopify sent. */
export interface ShopifyEvent {
  topic: string;
  shopDomain: string | null;
  webhookId: string | null;
  eventId: string | null;
  triggeredAt: string | null;
  apiVersion: string | null;
  resource: Record<string, unknown>;
}

const SIGNING_SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "App client secret",
  type: "secret",
  required: true,
  hint:
    'The client secret ("API secret key") of the Shopify app this connection\'s access token belongs to — Dev Dashboard: app > Settings > Credentials; legacy custom app: Settings > Apps and sales channels > Develop apps > API credentials. Shopify signs every webhook with it; deliveries are refused without it.',
};

const TOPICS_PARAM: Param = {
  key: "topics",
  label: "Topics",
  type: "string",
  required: true,
  placeholder: "orders/create, customers/update",
  hint:
    "Comma-separated webhook topics, e.g. orders/create. List: https://shopify.dev/docs/api/admin-rest/latest/resources/webhook#event-topics",
};

const EVENT_OUTPUT: OutputField[] = [
  { key: "topic", type: "string", label: "Topic" },
  { key: "shopDomain", type: "string", label: "Shop Domain" },
  { key: "webhookId", type: "string", label: "Webhook ID (delivery)" },
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "triggeredAt", type: "string", label: "Triggered At" },
  { key: "apiVersion", type: "string", label: "API Version" },
  { key: "resource", type: "object", label: "Resource" },
];

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

/** `acme` for `acme.myshopify.com` — the form the connection records. */
function shopHandle(domain: string): string {
  return domain.toLowerCase().replace(/\.myshopify\.com$/, "");
}

/** Delete one webhook subscription. One Shopify no longer has is already what we wanted. */
async function deleteWebhook(client: ShopifyClient, id: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(id)}.json`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof Error && /^Shopify (404|410) /.test(err.message)) return;
    throw err;
  }
}

/** Ids of the subscriptions that already deliver to `address`. */
async function webhooksPointingAt(client: ShopifyClient, address: string): Promise<string[]> {
  const res = await client.request<{ webhooks?: Array<{ id?: unknown; address?: unknown }> }>(
    "/webhooks.json",
    { query: { address, limit: 250, fields: "id,address,topic" } },
  );
  const found: string[] = [];
  for (const w of res?.webhooks ?? []) {
    const id = str(w.id);
    if (id && w.address === address) found.push(id);
  }
  return found;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The topics this trigger fires on; omitted for the trigger whose topics are a param. */
  topics?: string[];
  /** A representative resource for the sample. */
  sampleResource?: Record<string, unknown>;
}

/** Build one Shopify webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, ShopifyEvent, TriggerState> {
  const fixed = spec.topics;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [SIGNING_SECRET_PARAM] : [SIGNING_SECRET_PARAM, TOPICS_PARAM],
    output: EVENT_OUTPUT,
    sample: {
      topic: fixed?.[0] ?? "orders/create",
      shopDomain: "acme.myshopify.com",
      webhookId: "b54557e4-bdd9-4b37-8a5f-bf7d70bcd043",
      eventId: "98880cc8-1ee9-4a5c-8d6d-3d2a1ee0b2f5",
      triggeredAt: "2026-11-09T10:12:50.123456789Z",
      apiVersion: API_VERSION,
      resource: spec.sampleResource ??
        { id: 820982911946154500, admin_graphql_api_id: "gid://shopify/Order/820982911946154500" },
    } satisfies ShopifyEvent,

    async onSubscribe({ params, callbackUrl }, ctx) {
      requireSecret(params?.signingSecret);
      const topics = fixed ?? parseTopicList(params.topics);
      if (topics.length === 0) throw new Error("Choose at least one Shopify webhook topic.");
      const shop = shopFromConnection(ctx.connection);
      const client = new ShopifyClient(ctx);
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const webhookIds: string[] = [];
      try {
        for (const topic of topics) {
          const created = await client.request<{ webhook?: { id?: unknown } }>("/webhooks.json", {
            method: "POST",
            body: { webhook: { topic, address: callbackUrl, format: "json" } },
          });
          const id = str(created?.webhook?.id);
          if (!id) throw new Error(`Shopify created the "${topic}" webhook but returned no id.`);
          webhookIds.push(id);
        }
      } catch (err) {
        // Do not leave half a subscription behind: the host never learns these ids.
        for (const id of webhookIds) await deleteWebhook(client, id).catch(() => undefined);
        throw err;
      }
      return { webhookId: webhookIds[0], topics, shop, webhookIds };
    },

    async onUnsubscribe({ state }, ctx) {
      const s = state as Partial<TriggerState> | undefined;
      const ids = s?.webhookIds?.length ? s.webhookIds : s?.webhookId ? [s.webhookId] : [];
      if (ids.length === 0) return;
      const client = new ShopifyClient(ctx);
      for (const id of ids) await deleteWebhook(client, id);
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Shopify delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const secret = requireSecret(params?.signingSecret);
      const given = header(raw, "x-shopify-hmac-sha256");
      if (given === undefined || given === "") {
        throw new Error("Shopify delivery refused: the X-Shopify-Hmac-Sha256 header is missing.");
      }
      const expected = await hmac("SHA-256", secret, body, "base64");
      if (!timingSafeEqual(expected, given.trim())) {
        throw new Error("Shopify delivery refused: the signature does not match.");
      }

      const topic = str(header(raw, "x-shopify-topic"));
      if (!topic) throw new Error("Shopify delivery has no X-Shopify-Topic header.");
      const shopDomain = str(header(raw, "x-shopify-shop-domain"));
      if (state?.shop && (!shopDomain || shopHandle(shopDomain) !== state.shop.toLowerCase())) {
        throw new Error("Shopify delivery refused: it is for a different store.");
      }
      let resource: Record<string, unknown> | null;
      try {
        resource = asObject(JSON.parse(body));
      } catch {
        resource = null;
      }
      if (!resource) throw new Error("Shopify delivery body is not a JSON object.");
      const wanted = state?.topics ?? [];
      if (wanted.length > 0 && !wanted.includes(topic)) return [];
      return [{
        topic,
        shopDomain,
        webhookId: str(header(raw, "x-shopify-webhook-id")),
        eventId: str(header(raw, "x-shopify-event-id")),
        triggeredAt: str(header(raw, "x-shopify-triggered-at")),
        apiVersion: str(header(raw, "x-shopify-api-version")),
        resource,
      }];
    },
  };
}
