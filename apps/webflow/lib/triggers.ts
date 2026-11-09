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
  | "ecomm_new_order";

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
      const secret = requireSecret(state?.secretKey ?? params?.signingSecret);
      const body = requireRawBody(raw);
      const signature = header(raw, "x-webflow-signature");
      if (!signature) {
        throw new Error("Webflow delivery refused: the x-webflow-signature is missing.");
      }
      const timestamp = header(raw, "x-webflow-timestamp");
      if (!timestamp || !/^\d{10,16}$/.test(timestamp)) {
        throw new Error(
          "Webflow delivery refused: the x-webflow-timestamp is missing or malformed.",
        );
      }
      const expected = await hmac("SHA-256", secret, `${timestamp}:${body}`, "hex");
      if (!timingSafeEqual(expected, signature.toLowerCase())) {
        throw new Error("Webflow delivery refused: the signature does not match.");
      }
      // The timestamp is in milliseconds; the kit's window is in seconds.
      if (!withinTolerance(Number(timestamp) / 1000, Date.now())) {
        throw new Error(
          "Webflow delivery refused: the timestamp is outside the five-minute window.",
        );
      }
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
        itemId: str(payload.id) ?? str(payload.orderId),
        payload,
      }];
    },
  };
}
