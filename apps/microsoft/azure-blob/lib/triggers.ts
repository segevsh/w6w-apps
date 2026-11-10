import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import { header, requireRawBody, timingSafeEqual } from "../../_shared/webhook/mod.ts";

/**
 * Azure Blob Storage event triggers (rfcs/trigger.md, webhook form, manual setup, UNSIGNED).
 *
 * Blob events reach a webhook through Azure Event Grid. Creating the Event Grid subscription takes
 * an Azure Resource Manager call under Microsoft Entra authentication, which this app's storage
 * credential (shared key) cannot make, so the callback URL is entered in Azure once (portal, CLI or
 * IaC), and the endpoint answers Event Grid's validation handshake itself:
 *
 *   - Validation (`aeg-event-type: SubscriptionValidation`): the delivery holds one
 *     `Microsoft.EventGrid.SubscriptionValidationEvent` whose `data.validationCode` the endpoint
 *     must echo as `{ "validationResponse": "<code>" }` with status 200. Returned as
 *     `{ events: [], response }` (rfcs/trigger.md, D8 seam). Echoing proves nothing but that the
 *     endpoint exists, which is Event Grid's whole point; the optional `eventSubscriptionName` pin
 *     (the `aeg-subscription-name` header) refuses validation for any other subscription name.
 *   - Notification (`aeg-event-type: Notification`): a JSON array of Event Grid events.
 *
 * Trust model: Event Grid does NOT sign deliveries. The callback URL is the secret; keep it private.
 * The optional subscription-name pin narrows who can post, but a name is not a secret. Microsoft's own
 * hardening (Entra-protected webhook endpoints) is not available to this endpoint.
 *
 * Only the Event Grid event schema is supported: the CloudEvents schema validates with an HTTP
 * OPTIONS handshake the host cannot answer.
 *
 * Docs (verified 2026-11-10):
 * https://learn.microsoft.com/en-us/azure/event-grid/event-schema-blob-storage and
 * https://learn.microsoft.com/en-us/azure/event-grid/end-point-validation-event-grid-events-schema
 */

export interface TriggerParams {
  container?: string;
  eventSubscriptionName?: string;
}

/** The run's `trigger.event`: one Event Grid blob event. */
export interface BlobEvent {
  eventType: string;
  id: string | null;
  eventTime: string | null;
  topic: string | null;
  subject: string | null;
  container: string | null;
  blobName: string | null;
  url: string | null;
  api: string | null;
  contentType: string | null;
  contentLength: number | null;
  blobType: string | null;
  eTag: string | null;
  sequencer: string | null;
  data: Record<string, unknown>;
}

const CONTAINER_PARAM: Param = {
  key: "container",
  label: "Container",
  type: "string",
  advanced: true,
  hint:
    "Only fire for blobs in this container. Leave empty for every container the Event Grid subscription covers.",
};

const SUBSCRIPTION_NAME_PARAM: Param = {
  key: "eventSubscriptionName",
  label: "Event Grid subscription name",
  type: "string",
  advanced: true,
  hint:
    "The name of the Event Grid event subscription you create in Azure. When set, deliveries from any other subscription name (the aeg-subscription-name header) are refused. Not a secret: keep the callback URL private too.",
};

const OUTPUT: OutputField[] = [
  { key: "eventType", type: "string", label: "Event type" },
  { key: "id", type: "string", label: "Event ID" },
  { key: "eventTime", type: "string", label: "Event time (ISO 8601)" },
  { key: "topic", type: "string", label: "Storage account resource ID" },
  { key: "subject", type: "string", label: "Subject" },
  { key: "container", type: "string", label: "Container" },
  { key: "blobName", type: "string", label: "Blob name" },
  { key: "url", type: "string", label: "Blob URL" },
  { key: "api", type: "string", label: "Storage API that triggered the event" },
  { key: "contentType", type: "string", label: "Content type" },
  { key: "contentLength", type: "number", label: "Content length (bytes)" },
  { key: "blobType", type: "string", label: "Blob type" },
  { key: "eTag", type: "string", label: "ETag" },
  { key: "sequencer", type: "string", label: "Sequencer" },
  { key: "data", type: "object", label: "Full event data" },
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

const SUBJECT = /^\/blobServices\/default\/containers\/([^/]+)\/blobs\/(.+)$/;

/** One Event Grid blob event of the wanted type, or null. */
export function normalizeEvent(item: unknown, eventType: string): BlobEvent | null {
  const e = asObject(item);
  if (!e || e.eventType !== eventType) return null;
  const data = asObject(e.data) ?? {};
  const subject = str(e.subject);
  const m = subject ? SUBJECT.exec(subject) : null;
  const length = Number(data.contentLength);
  return {
    eventType,
    id: str(e.id),
    eventTime: str(e.eventTime),
    topic: str(e.topic),
    subject,
    container: m ? m[1] : null,
    blobName: m ? m[2] : null,
    url: str(data.url),
    api: str(data.api),
    contentType: str(data.contentType),
    contentLength: Number.isFinite(length) && data.contentLength != null ? length : null,
    blobType: str(data.blobType),
    eTag: str(data.eTag),
    sequencer: str(data.sequencer),
    data,
  };
}

export interface WebhookTriggerSpec {
  key: string;
  title: string;
  description: string;
  eventType: string;
  sample: BlobEvent;
}

/** Build one Azure Blob event webhook trigger. */
export function webhookTrigger(
  spec: WebhookTriggerSpec,
): TriggerDefinition<TriggerParams, BlobEvent, { callbackUrl: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [CONTAINER_PARAM, SUBSCRIPTION_NAME_PARAM],
    output: OUTPUT,
    sample: spec.sample,

    // Manual webhook: the Event Grid subscription is created in Azure, pointing at this URL.
    onSubscribe({ callbackUrl }) {
      return { callbackUrl };
    },
    onUnsubscribe() {},

    handleIngest({ raw, params }) {
      if (raw.method.toUpperCase() !== "POST") {
        throw new Error(`Event Grid delivers with POST, not ${raw.method}.`);
      }
      const body = requireRawBody(raw);
      const kind = header(raw, "aeg-event-type");
      if (
        kind !== "SubscriptionValidation" && kind !== "Notification" &&
        kind !== "SubscriptionDeletion"
      ) {
        throw new Error(
          "Not an Event Grid delivery: the aeg-event-type header is missing or unknown.",
        );
      }
      const pin = params?.eventSubscriptionName?.trim();
      if (pin) {
        const name = header(raw, "aeg-subscription-name");
        if (!name || !timingSafeEqual(name.toLowerCase(), pin.toLowerCase())) {
          throw new Error(
            "Event Grid delivery refused: it is not from the expected event subscription.",
          );
        }
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error("Not an Event Grid delivery: expected a JSON array of events.");
      }
      if (!Array.isArray(parsed)) {
        throw new Error("Not an Event Grid delivery: expected a JSON array of events.");
      }
      if (kind === "SubscriptionDeletion") return [];
      if (kind === "SubscriptionValidation") {
        const first = asObject(parsed[0]);
        const code = str(asObject(first?.data)?.validationCode);
        if (
          first?.eventType !== "Microsoft.EventGrid.SubscriptionValidationEvent" || !code ||
          !/^[A-Za-z0-9-]{8,128}$/.test(code)
        ) {
          throw new Error(
            "Event Grid validation refused: the validation code is missing or malformed.",
          );
        }
        return {
          events: [],
          response: {
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ validationResponse: code }),
          },
        };
      }
      const container = params?.container?.trim();
      const out: BlobEvent[] = [];
      for (const item of parsed) {
        const e = normalizeEvent(item, spec.eventType);
        if (e && (!container || e.container === container)) out.push(e);
      }
      return out;
    },
  };
}
