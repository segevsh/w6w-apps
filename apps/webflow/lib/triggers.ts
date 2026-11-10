import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";
import { WebflowClient } from "./client.ts";

/**
 * Webflow webhook triggers (rfcs/trigger.md, webhook form).
 *
 *   - `onSubscribe` creates a site webhook for one `triggerType` pointed at the host's
 *     `callbackUrl`. A webhook made with a Site API token comes back with its own `secretKey`,
 *     kept in the subscription state. One made through an OAuth app has no secret of its own and
 *     is signed with the app's client secret, which the user pastes as `signingSecret`.
 *   - `handleIngest` verifies `x-webflow-signature` (hex HMAC-SHA256 of
 *     `<x-webflow-timestamp>:<raw body>`) and rejects a timestamp more than five minutes off,
 *     BEFORE it parses anything. Webhooks created in the Webflow dashboard carry neither header,
 *     so they are refused rather than accepted unsigned.
 *   - `onUnsubscribe` deletes the webhook; one Webflow no longer has counts as deleted.
 *
 * Docs (verified 2026-11-09): https://developers.webflow.com/data/docs/working-with-webhooks
 */

export type TriggerType =
  | "form_submission"
  | "collection_item_created"
  | "collection_item_changed"
  | "collection_item_deleted"
  | "collection_item_published"
  | "collection_item_unpublished"
  | "ecomm_new_order"
  | "ecomm_order_changed"
  | "ecomm_inventory_changed"
  | "site_publish"
  | "page_created"
  | "page_metadata_updated"
  | "page_deleted"
  | "comment_created";

/**
 * Every `triggerType` the Create Webhook endpoint accepts
 * (https://developers.webflow.com/data/reference/webhooks/create, verified 2026-11-10). The
 * any-event trigger registers the first 14 by default; the three `branch_*` ones only when asked.
 */
export const ALL_TRIGGER_TYPES = [
  "form_submission",
  "site_publish",
  "page_created",
  "page_metadata_updated",
  "page_deleted",
  "ecomm_new_order",
  "ecomm_order_changed",
  "ecomm_inventory_changed",
  "collection_item_created",
  "collection_item_changed",
  "collection_item_deleted",
  "collection_item_published",
  "collection_item_unpublished",
  "comment_created",
  "branch_created",
  "branch_merged",
  "branch_deleted",
] as const;
const DEFAULT_TRIGGER_TYPES = ALL_TRIGGER_TYPES.slice(0, 14);

export interface TriggerParams {
  siteId?: string;
  collectionId?: string;
  formName?: string;
  signingSecret?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  webhookId: string;
  siteId: string;
  triggerType: string;
  /** The webhook's own signing key, when Webflow returned one. */
  secretKey?: string;
}

/** The any-event trigger registers one webhook per event type; each keeps its own signing key. */
export interface AnyEventState {
  siteId: string;
  webhooks: Array<{ webhookId: string; triggerType: string; secretKey?: string }>;
}

/** The run's `trigger.event`: one Webflow delivery. */
export interface WebflowEvent {
  triggerType: string;
  siteId: string | null;
  collectionId: string | null;
  itemId: string | null;
  payload: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "triggerType", type: "string", label: "Event" },
  { key: "siteId", type: "string", label: "Site ID" },
  { key: "collectionId", type: "string", label: "Collection ID" },
  { key: "itemId", type: "string", label: "Record ID" },
  { key: "payload", type: "object", label: "Payload" },
];

export function sampleFor(triggerType: string): WebflowEvent {
  const payload: Record<string, unknown> = triggerType === "form_submission"
    ? {
      id: "6321ca84df3949bfc6752327",
      name: "Contact",
      siteId: "562ac0395358780a1f5e6fbd",
      data: { Email: "ada@example.com", Message: "Hello" },
      submittedAt: "2026-11-09T10:00:00.000Z",
    }
    : triggerType === "site_publish"
    ? {
      domains: ["example.webflow.io"],
      publishedBy: { displayName: "Ada Lovelace" },
      publishScope: "site",
      site: "562ac0395358780a1f5e6fbd",
      publishTime: "2026-11-09T10:00:00.000Z",
    }
    : triggerType.startsWith("page_")
    ? {
      siteId: "562ac0395358780a1f5e6fbd",
      pageId: "66a3cfb276641574f5d58311",
      pageTitle: "Heart of Gold Specs",
      pageName: "Heart of Gold Specs",
      archived: false,
      draft: false,
      isBranch: false,
      publishedPath: "/specs",
    }
    : triggerType === "comment_created"
    ? {
      content: "Looks good to me",
      isResolved: false,
      author: { userId: "6287ec36a841b25637c663df", email: "ada@example.com", name: "Ada" },
      mentionedUsers: [],
    }
    : triggerType === "ecomm_inventory_changed"
    ? { quantity: 100, inventoryType: "finite" }
    : triggerType === "ecomm_order_changed"
    ? {
      orderId: "SO-1001",
      status: "fulfilled",
      comment: "",
      customerInfo: { email: "ada@example.com" },
    }
    : triggerType === "ecomm_new_order"
    ? {
      orderId: "SO-1001",
      status: "unfulfilled",
      customerInfo: { fullName: "Ada Lovelace", email: "ada@example.com" },
    }
    : {
      id: "65e0f1d2a3b4c5d6e7f80910",
      collectionId: "65e0f1d2a3b4c5d6e7f80901",
      isDraft: false,
      lastUpdated: "2026-11-09T10:00:00.000Z",
      fieldData: { name: "Hello world", slug: "hello-world" },
    };
  return {
    triggerType,
    siteId: "562ac0395358780a1f5e6fbd",
    collectionId: typeof payload.collectionId === "string" ? payload.collectionId : null,
    itemId: typeof payload.id === "string" ? payload.id : null,
    payload,
  };
}

const SITE_PARAM: Param = {
  key: "siteId",
  label: "Site ID",
  type: "string",
  required: true,
  hint: "The Webflow site to watch (Site settings → General, or the List Sites action).",
};

const COLLECTION_PARAM: Param = {
  key: "collectionId",
  label: "Collection ID",
  type: "string",
  hint: "Only fire for this CMS collection. Leave blank for every collection on the site.",
};

const FORM_PARAM: Param = {
  key: "formName",
  label: "Form name",
  type: "string",
  hint: "Only fire for the form with this name. Leave blank for every form on the site.",
};

const SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "OAuth app client secret",
  type: "secret",
  hint:
    "Only when the connection is an OAuth app: Webflow then signs deliveries with the app's client secret (Workspace settings → Apps & Integrations). Leave blank for a Site API token, whose webhook returns its own secret.",
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

/** WebflowClient throws `Webflow <status> …`; a 404/410 means the webhook is already gone. */
function isGone(err: unknown): boolean {
  return err instanceof Error && /^Webflow (404|410) /.test(err.message);
}

async function deleteWebhook(client: WebflowClient, webhookId: string): Promise<void> {
  try {
    await client.request(`/webhooks/${encodeURIComponent(webhookId)}`, { method: "DELETE" });
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}

/**
 * The Webflow signature check, shared by every trigger: `x-webflow-signature` is the hex
 * HMAC-SHA256 of `<x-webflow-timestamp>:<raw body>`, and the timestamp (milliseconds) must be
 * within five minutes. `secrets` holds the candidate signing keys (one per webhook); the
 * delivery passes when any one matches. Returns the raw body once verified.
 */
async function verifyDelivery(
  raw: { rawBody?: unknown; headers: Record<string, string> },
  secrets: unknown[],
): Promise<string> {
  const keys = secrets.map((s) => requireSecret(s));
  const body = requireRawBody(raw);
  const signature = header(raw, "x-webflow-signature");
  if (!signature) {
    throw new Error("Webflow delivery refused: the x-webflow-signature is missing.");
  }
  const timestamp = header(raw, "x-webflow-timestamp");
  if (!timestamp || !/^\d{10,16}$/.test(timestamp)) {
    throw new Error("Webflow delivery refused: the x-webflow-timestamp is missing or malformed.");
  }
  let matched = false;
  for (const key of keys) {
    const expected = await hmac("SHA-256", key, `${timestamp}:${body}`, "hex");
    if (timingSafeEqual(expected, signature.toLowerCase())) matched = true;
  }
  if (!matched) {
    throw new Error("Webflow delivery refused: the signature does not match.");
  }
  // The timestamp is in milliseconds; the kit's window is in seconds.
  if (!withinTolerance(Number(timestamp) / 1000, Date.now())) {
    throw new Error("Webflow delivery refused: the timestamp is outside the five-minute window.");
  }
  return body;
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  triggerType: TriggerType;
}

/** Build one Webflow webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, WebflowEvent, Partial<TriggerState>> {
  const isForm = spec.triggerType === "form_submission";
  const isCollection = spec.triggerType.startsWith("collection_item_");
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [
      SITE_PARAM,
      ...(isCollection ? [COLLECTION_PARAM] : []),
      ...(isForm ? [FORM_PARAM] : []),
      SECRET_PARAM,
    ],
    output: EVENT_OUTPUT,
    sample: sampleFor(spec.triggerType),

    async onSubscribe({ params, callbackUrl }, ctx) {
      const siteId = params.siteId?.trim();
      if (!siteId) throw new Error("Set Site ID to the Webflow site to watch.");
      const body: Record<string, unknown> = { triggerType: spec.triggerType, url: callbackUrl };
      const formName = params.formName?.trim();
      if (isForm && formName) body.filter = { name: formName };
      const client = new WebflowClient(ctx);
      const created = await client.request<{ id?: unknown; secretKey?: unknown }>(
        `/sites/${encodeURIComponent(siteId)}/webhooks`,
        { method: "POST", body },
      );
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("Webflow created the webhook but returned no id.");
      const secretKey = str(created?.secretKey);
      if (!secretKey && !params.signingSecret) {
        // Nothing could verify its deliveries: undo the registration and say why.
        await deleteWebhook(client, webhookId).catch(() => {});
        throw new Error(
          "Webflow returned no signing secret for this webhook: set the OAuth app client secret.",
        );
      }
      return {
        webhookId,
        siteId,
        triggerType: spec.triggerType,
        ...(secretKey ? { secretKey } : {}),
      };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str(state?.webhookId);
      if (webhookId) await deleteWebhook(new WebflowClient(ctx), webhookId);
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Webflow delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = await verifyDelivery(raw, [state?.secretKey ?? params?.signingSecret]);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Webflow delivery is not valid JSON.");
      }
      const d = asObject(parsed);
      const payload = asObject(d?.payload);
      const triggerType = str(d?.triggerType);
      if (!d || !payload || !triggerType) {
        throw new Error("Webflow delivery has no triggerType or payload.");
      }
      if (triggerType !== spec.triggerType) return [];
      const collectionId = str(payload.collectionId);
      const wanted = isCollection ? params?.collectionId?.trim() : "";
      if (wanted && collectionId !== wanted) return [];
      return [{
        triggerType,
        siteId: str(payload.siteId) ?? str(state?.siteId),
        collectionId,
        itemId: str(payload.id) ?? str(payload.orderId) ?? str(payload.pageId) ??
          str(payload.commentId),
        payload,
      }];
    },
  };
}

const EVENTS_PARAM: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Webflow event types (form_submission, site_publish, page_created, page_metadata_updated, page_deleted, ecomm_new_order, ecomm_order_changed, ecomm_inventory_changed, collection_item_created, collection_item_changed, collection_item_deleted, collection_item_published, collection_item_unpublished, comment_created, branch_created, branch_merged, branch_deleted). Leave blank for every event except the branch ones.",
};

/** The comma-separated `events` param → the event types to register (deduped, validated). */
export function chooseEvents(events: string | undefined): string[] {
  const asked = (events ?? "").split(",").map((e) => e.trim()).filter((e) => e !== "");
  if (asked.length === 0) return [...DEFAULT_TRIGGER_TYPES];
  const known = new Set<string>(ALL_TRIGGER_TYPES);
  const bad = asked.filter((e) => !known.has(e));
  if (bad.length > 0) throw new Error(`Unknown Webflow event type(s): ${bad.join(", ")}.`);
  return [...new Set(asked)];
}

/**
 * The Any Event trigger. Webflow has no "all events" subscription, so one site webhook is created
 * per chosen event type (empty `events` = the 14 documented ones); each keeps its own signing key.
 * A delivery is verified against those keys and kept only when its `triggerType` is one registered.
 */
export function anyEventTrigger(
  spec: { key: string; title: string; description: string },
): TriggerDefinition<TriggerParams & { events?: string }, WebflowEvent, Partial<AnyEventState>> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [SITE_PARAM, EVENTS_PARAM, SECRET_PARAM],
    output: EVENT_OUTPUT,
    sample: sampleFor("site_publish"),

    async onSubscribe({ params, callbackUrl }, ctx) {
      const siteId = params.siteId?.trim();
      if (!siteId) throw new Error("Set Site ID to the Webflow site to watch.");
      const types = chooseEvents(params.events);
      const client = new WebflowClient(ctx);
      const webhooks: NonNullable<AnyEventState["webhooks"]> = [];
      try {
        for (const triggerType of types) {
          const created = await client.request<{ id?: unknown; secretKey?: unknown }>(
            `/sites/${encodeURIComponent(siteId)}/webhooks`,
            { method: "POST", body: { triggerType, url: callbackUrl } },
          );
          const webhookId = str(created?.id);
          if (!webhookId) throw new Error("Webflow created the webhook but returned no id.");
          const secretKey = str(created?.secretKey);
          webhooks.push({ webhookId, triggerType, ...(secretKey ? { secretKey } : {}) });
          if (!secretKey && !params.signingSecret) {
            throw new Error(
              "Webflow returned no signing secret for this webhook: set the OAuth app client secret.",
            );
          }
        }
      } catch (err) {
        // Undo the registrations made so far: nothing could verify or use them.
        for (const w of webhooks) await deleteWebhook(client, w.webhookId).catch(() => {});
        throw err;
      }
      return { siteId, webhooks };
    },

    async onUnsubscribe({ state }, ctx) {
      const client = new WebflowClient(ctx);
      for (const w of state?.webhooks ?? []) {
        const webhookId = str(w?.webhookId);
        if (webhookId) await deleteWebhook(client, webhookId);
      }
    },

    async handleIngest({ raw, params, state }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Webflow delivers webhooks with POST, not ${raw.method}.`);
      }
      const hooks = state?.webhooks ?? [];
      const body = await verifyDelivery(
        raw,
        hooks.length > 0
          ? hooks.map((w) => w.secretKey ?? params?.signingSecret)
          : [params?.signingSecret],
      );
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Webflow delivery is not valid JSON.");
      }
      const d = asObject(parsed);
      const payload = asObject(d?.payload);
      const triggerType = str(d?.triggerType);
      if (!d || !payload || !triggerType) {
        throw new Error("Webflow delivery has no triggerType or payload.");
      }
      if (!hooks.some((w) => w.triggerType === triggerType)) return [];
      return [{
        triggerType,
        siteId: str(payload.siteId) ?? str(state?.siteId),
        collectionId: str(payload.collectionId),
        itemId: str(payload.id) ?? str(payload.orderId) ?? str(payload.pageId) ??
          str(payload.commentId),
        payload,
      }];
    },
  };
}
