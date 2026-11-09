import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  hmac,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
  withinTolerance,
} from "../../_shared/webhook/mod.ts";

/**
 * Customer.io reporting-webhook triggers (rfcs/trigger.md, webhook form, manual receiver).
 *
 * A reporting webhook is configured by hand in Customer.io (Integrations > Reporting webhooks);
 * this app's credentials are Track API credentials, which cannot register one, so:
 *
 *   - `onSubscribe` makes no Customer.io call. It checks that the pasted signing key is present
 *     and returns the callback URL to paste into Customer.io; `onUnsubscribe` is a no-op (the
 *     user removes the reporting webhook in Customer.io).
 *   - `handleIngest` verifies `X-CIO-Signature` — lowercase hex HMAC-SHA256 of
 *     `v0:<X-CIO-Timestamp>:<raw body>` under the reporting webhook's signing key (D5 (2): a
 *     secret-typed `signingSecret` param) — BEFORE it parses anything. Customer.io always
 *     signs, so there is no unsigned path. Deliveries whose timestamp is more than 5 minutes
 *     from now are refused (a Customer.io retry later than that is lost by design).
 *
 * Source: https://docs.customer.io/integrations/data-out/connections/webhook/ ("Securely verify
 * requests") and https://docs.customer.io/integrations/api/webhooks/ (verified 2026-11-09).
 */

export interface TriggerParams {
  signingSecret?: string;
  /** Generic trigger only: keep events of this object type (`email`, `customer`, …). */
  objectType?: string;
  /** Generic trigger only: keep events of this metric (`opened`, `bounced`, …). */
  metric?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  mode: "manual";
  callbackUrl: string;
}

/** The stored event: one verified delivery. */
export interface CustomerIoEvent {
  eventId: string | null;
  objectType: string | null;
  metric: string | null;
  timestamp: number | null;
  customerId: string | null;
  recipient: string | null;
  deliveryId: string | null;
  data: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "eventId", type: "string", label: "Event ID" },
  { key: "objectType", type: "string", label: "Object Type" },
  { key: "metric", type: "string", label: "Metric" },
  { key: "timestamp", type: "number", label: "Event Time (epoch seconds)" },
  { key: "customerId", type: "string", label: "Customer ID" },
  { key: "recipient", type: "string", label: "Recipient or Email Address" },
  { key: "deliveryId", type: "string", label: "Delivery ID" },
  { key: "data", type: "object", label: "Event Data" },
];

/** Signatures older or newer than this many seconds are refused (replay window). */
const TOLERANCE_SEC = 300;

const SECRET_PARAM: Param = {
  key: "signingSecret",
  label: "Signing Key",
  type: "secret",
  required: true,
  hint:
    "The signing key of this reporting webhook: Customer.io > Integrations > Reporting webhooks, on the page where you enter the endpoint.",
};

const OBJECT_TYPE_PARAM: Param = {
  key: "objectType",
  label: "Object Type",
  type: "string",
  hint: "Only fire for this object type, e.g. email, customer, sms, push. Leave blank for all.",
};

const METRIC_PARAM: Param = {
  key: "metric",
  label: "Metric",
  type: "string",
  hint:
    "Only fire for this metric, e.g. opened, clicked, bounced, unsubscribed. Leave blank for all.",
};

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

const refused = (why: string) => new Error(`webhook delivery refused: ${why}`);

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Fixed event, or omitted for the trigger whose filters are params. */
  objectType?: string;
  metric?: string;
  sample: CustomerIoEvent;
}

/** Build one Customer.io reporting-webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, CustomerIoEvent, TriggerState> {
  const fixed = spec.objectType !== undefined;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [SECRET_PARAM] : [SECRET_PARAM, OBJECT_TYPE_PARAM, METRIC_PARAM],
    output: EVENT_OUTPUT,
    sample: spec.sample,
    // Customer.io is configured by hand; no Customer.io API call (so no Connection) is made.
    requiresAuth: false,

    onSubscribe({ params, callbackUrl }) {
      requireSecret(params?.signingSecret);
      return { mode: "manual", callbackUrl };
    },

    onUnsubscribe() {},

    async handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Customer.io delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const secret = requireSecret(params?.signingSecret);
      const signature = header(raw, "x-cio-signature");
      const timestamp = header(raw, "x-cio-timestamp");
      if (!signature || !timestamp) throw refused("the signature headers are missing");
      const seconds = /^\d{1,12}$/.test(timestamp) ? Number(timestamp) : NaN;
      if (!withinTolerance(seconds, Date.now(), TOLERANCE_SEC)) {
        throw refused("the signature timestamp is outside the accepted window");
      }
      const expected = await hmac("SHA-256", secret, `v0:${timestamp}:${body}`, "hex");
      if (!timingSafeEqual(expected, signature.toLowerCase())) {
        throw refused("the signature does not match");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Customer.io delivery body is not valid JSON.");
      }
      const o = asObject(parsed);
      if (!o) return [];
      // Legacy-format webhooks carry `event_type` ("email_opened") instead of object_type + metric.
      const legacy = str(o.event_type)?.match(/^([a-z]+)_(.+)$/);
      const objectType = str(o.object_type) ?? legacy?.[1] ?? null;
      const metric = str(o.metric) ?? legacy?.[2] ?? null;
      const wantType = fixed ? spec.objectType : params?.objectType?.trim() || undefined;
      const wantMetric = fixed ? spec.metric : params?.metric?.trim() || undefined;
      if (wantType !== undefined && objectType !== wantType) return [];
      if (wantMetric !== undefined && metric !== wantMetric) return [];
      const data = asObject(o.data) ?? {};
      return [{
        eventId: str(o.event_id),
        objectType,
        metric,
        timestamp: typeof o.timestamp === "number" ? o.timestamp : null,
        customerId: str(data.customer_id),
        recipient: str(data.recipient) ?? str(data.email_address),
        deliveryId: str(data.delivery_id),
        data,
      }];
    },
  };
}
