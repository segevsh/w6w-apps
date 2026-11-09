import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { header, requireRawBody, requireSecret } from "../../_shared/webhook/mod.ts";
import { baseUrl, PayPalClient, sandboxFromConnection } from "./client.ts";

/**
 * PayPal webhook triggers (https://developer.paypal.com/api/rest/webhooks/rest/, verified 2026-11-09).
 *
 *   - `onSubscribe` creates a webhook (`POST /v1/notifications/webhooks`: the listener `url` and
 *     the `event_types`) pointed at the host's `callbackUrl`, after deleting any webhook already
 *     pointed there. PayPal returns the webhook's id; that id, not a shared secret, anchors
 *     verification, and it is kept in the subscription state.
 *   - `onUnsubscribe` deletes it; one PayPal no longer has counts as deleted.
 *   - `handleIngest` verifies the delivery with PayPal's own endpoint
 *     (`POST /v1/notifications/verify-webhook-signature`) and refuses it unless that answers
 *     `SUCCESS`. PayPal signs with an asymmetric key published in a certificate it hosts, so
 *     the only way to check a delivery without X.509 parsing in the sandbox is to post the five
 *     `PAYPAL-*` header values, the webhook id from state and the event back to PayPal.
 *     PayPal computes a CRC32 over the event bytes it is sent, so the event is spliced into the
 *     request as the exact raw body text (`webhook_event`), never re-serialised from a parse.
 *     The webhook id comes from state, never from the request, so a forged delivery cannot name
 *     a webhook of its own.
 *
 * PayPal defines no signature timestamp window, so there is no replay window to enforce; each
 * event carries its `id` (and the `transmissionId`) for skipping a duplicate.
 */

export interface TriggerParams {
  /** Generic trigger only: comma-separated PayPal event types, or `*`. */
  eventTypes?: string;
}

/** What `onSubscribe` returns and the host persists on the subscription. */
export interface TriggerState {
  /** The PayPal webhook id; verification is made against it. */
  webhookId: string;
  eventTypes: string[];
}

/** The run's `trigger.event`: the PayPal event notification. */
export interface PayPalEvent {
  id: string;
  eventType: string;
  resourceType: string | null;
  summary: string | null;
  createTime: string | null;
  eventVersion: string | null;
  resourceVersion: string | null;
  transmissionId: string;
  resource: Record<string, unknown>;
}

const EVENT_TYPES_PARAM: Param = {
  key: "eventTypes",
  label: "Event types",
  type: "string",
  required: true,
  placeholder: "PAYMENT.SALE.COMPLETED, BILLING.SUBSCRIPTION.CANCELLED",
  hint:
    "Comma-separated PayPal event types, or * for every event. List: https://developer.paypal.com/api/rest/webhooks/event-names/",
};

const EVENT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "eventType", type: "string", label: "Event Type" },
  { key: "resourceType", type: "string", label: "Resource Type" },
  { key: "summary", type: "string", label: "Summary" },
  { key: "createTime", type: "string", label: "Created At" },
  { key: "eventVersion", type: "string", label: "Event Version" },
  { key: "resourceVersion", type: "string", label: "Resource Version" },
  { key: "transmissionId", type: "string", label: "Transmission ID" },
  { key: "resource", type: "object", label: "Resource" },
];

/** The five headers PayPal puts on every delivery, in the names its verify endpoint takes. */
const SIGNATURE_HEADERS = {
  auth_algo: "paypal-auth-algo",
  cert_url: "paypal-cert-url",
  transmission_id: "paypal-transmission-id",
  transmission_sig: "paypal-transmission-sig",
  transmission_time: "paypal-transmission-time",
} as const;

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

/** Split the generic trigger's comma-separated event type list. */
export function parseEventTypeList(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => s !== ""))];
}

/** Delete one webhook. One PayPal no longer has is already what we wanted. */
async function deleteWebhook(client: PayPalClient, id: string): Promise<void> {
  try {
    await client.request(`/v1/notifications/webhooks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (err instanceof Error && /^PayPal (404|410) /.test(err.message)) return;
    throw err;
  }
}

/** Ids of the app's webhooks that already deliver to `url`. */
async function webhooksPointingAt(client: PayPalClient, url: string): Promise<string[]> {
  const res = await client.request<{ webhooks?: Array<{ id?: unknown; url?: unknown }> }>(
    "/v1/notifications/webhooks",
  );
  const found: string[] = [];
  for (const w of res?.webhooks ?? []) {
    const id = str(w.id);
    if (id && w.url === url) found.push(id);
  }
  return found;
}

/**
 * Ask PayPal whether this delivery is genuine. `rawBody` is spliced in verbatim as the
 * `webhook_event` value (after checking it is one JSON object, so it cannot break out of its
 * position), because PayPal checksums the exact text it is given.
 */
async function paypalAccepts(
  ctx: HookContext,
  webhookId: string,
  signature: Record<keyof typeof SIGNATURE_HEADERS, string>,
  rawBody: string,
): Promise<boolean> {
  const fields = Object.entries({ ...signature, webhook_id: webhookId })
    .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
    .join(",");
  const res = await ctx.fetch(
    `${baseUrl(sandboxFromConnection(ctx.connection))}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: `{${fields},"webhook_event":${rawBody}}`,
    },
  );
  if (!res.ok) {
    throw new Error(`PayPal delivery refused: PayPal's verification call failed (${res.status}).`);
  }
  let answer: unknown;
  try {
    answer = JSON.parse(await res.text());
  } catch {
    answer = null;
  }
  return asObject(answer)?.verification_status === "SUCCESS";
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** The event types this trigger fires on; omitted for the trigger whose types are a param. */
  eventTypes?: string[];
  /** A representative `resource` for the sample. */
  sampleResource?: Record<string, unknown>;
}

/** Build one PayPal webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, PayPalEvent, TriggerState> {
  const fixed = spec.eventTypes;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: fixed ? [] : [EVENT_TYPES_PARAM],
    output: EVENT_OUTPUT,
    sample: {
      id: "WH-58D329510W468432D-8HN650336L201105X",
      eventType: fixed?.[0] ?? "PAYMENT.SALE.COMPLETED",
      resourceType: "capture",
      summary: "Payment completed for $ 20.0 USD",
      createTime: "2026-11-09T10:12:50.000Z",
      eventVersion: "1.0",
      resourceVersion: "2.0",
      transmissionId: "b4d5e6f0-1c2d-11ef-9a3b-0242ac120002",
      resource: spec.sampleResource ?? { id: "5O190127TN364715T", status: "COMPLETED" },
    } satisfies PayPalEvent,

    async onSubscribe({ params, callbackUrl }, ctx) {
      const eventTypes = fixed ?? parseEventTypeList(params.eventTypes);
      if (eventTypes.length === 0) throw new Error("Choose at least one PayPal event type.");
      const client = new PayPalClient(ctx);
      for (const id of await webhooksPointingAt(client, callbackUrl)) {
        await deleteWebhook(client, id);
      }
      const created = await client.request<{ id?: unknown }>("/v1/notifications/webhooks", {
        method: "POST",
        body: { url: callbackUrl, event_types: eventTypes.map((name) => ({ name })) },
      });
      const webhookId = str(created?.id);
      if (!webhookId) throw new Error("PayPal created the webhook but returned no id.");
      return { webhookId, eventTypes };
    },

    async onUnsubscribe({ state }, ctx) {
      const webhookId = str((state as Partial<TriggerState> | undefined)?.webhookId);
      if (webhookId) await deleteWebhook(new PayPalClient(ctx), webhookId);
    },

    async handleIngest({ raw, state }, ctx) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`PayPal delivers webhooks with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      // The webhook id anchors the check; it comes from state, never from the request. An
      // unset id must refuse, like an unset secret.
      const webhookId = requireSecret(state?.webhookId);
      const signature = {} as Record<keyof typeof SIGNATURE_HEADERS, string>;
      for (const [field, name] of Object.entries(SIGNATURE_HEADERS)) {
        const value = header(raw, name);
        if (value === undefined || value === "") {
          throw new Error(`PayPal delivery refused: the ${name.toUpperCase()} header is missing.`);
        }
        signature[field as keyof typeof SIGNATURE_HEADERS] = value;
      }
      let event: Record<string, unknown> | null;
      try {
        event = asObject(JSON.parse(body));
      } catch {
        event = null;
      }
      if (!event) throw new Error("PayPal delivery refused: the body is not a JSON object.");

      if (!(await paypalAccepts(ctx, webhookId, signature, body))) {
        throw new Error("PayPal delivery refused: PayPal did not verify the signature.");
      }

      const eventType = str(event.event_type);
      const id = str(event.id);
      if (!eventType || !id) {
        throw new Error("Not a PayPal event notification: expected id and event_type.");
      }
      const wanted = state?.eventTypes ?? [];
      if (wanted.length > 0 && !wanted.includes("*") && !wanted.includes(eventType)) return [];
      return [{
        id,
        eventType,
        resourceType: str(event.resource_type),
        summary: str(event.summary),
        createTime: str(event.create_time),
        eventVersion: str(event.event_version),
        resourceVersion: str(event.resource_version),
        transmissionId: signature.transmission_id,
        resource: asObject(event.resource) ?? {},
      }];
    },
  };
}
