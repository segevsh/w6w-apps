import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, PracticeBetterClient, toList } from "../lib/client.ts";

/**
 * `POST /webhooks/subscription` — subscribe an endpoint to Practice Better events.
 *
 * Security: **`[read]`** — and that is the document's own text, not a typo in
 * this file. Both this create and `delete-webhook-subscription` are declared
 * under the `read` scope, while every other mutating operation in this app
 * requires `[read, write]`. It is recorded here as written rather than
 * "corrected", because sending a write-scoped credential where `read` suffices is
 * a permission change this app has no authority to make on the vendor's behalf.
 *
 * The three required body fields each do something specific:
 *
 *  - `endpointUrl` — where the events are delivered (the document types it as a
 *    URI);
 *  - `eventTypes` — at least one, and the document's own hint is to enumerate
 *    them from `GET /webhooks/subscription/event/types`, which
 *    `list-webhook-event-types` implements;
 *  - `verificationToken` — "a secret you generate and store on your endpoint,
 *    used to authenticate the one-time handshake". Practice Better verifies the
 *    endpoint with it **before** events start flowing, so the value has to be the
 *    one your receiver already holds. It is collected as a secret field rather
 *    than left in the clear in a form.
 *
 * Not idempotent: a second call creates a second subscription, and the handshake
 * runs again.
 */
interface Input {
  endpointUrl: string;
  eventTypes: string[] | string;
  verificationToken: string;
  description?: string;
  autoEnable?: boolean;
  metadata?: unknown;
}

const createWebhookSubscription: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-webhook-subscription",
  type: "perform",
  resource: "webhook-subscription",
  title: "Create Webhook Subscription",
  description:
    "Subscribe an HTTPS endpoint to Practice Better events. Practice Better verifies the endpoint " +
    "with `verificationToken` before events start flowing. Requires only the `read` scope, as " +
    "written in the API document.",
  idempotent: false,
  params: [
    {
      key: "endpointUrl",
      label: "Endpoint URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/practicebetter",
      hint: "Where the events are delivered. The document types this as a URI.",
    },
    {
      key: "eventTypes",
      label: "Event types",
      type: "array",
      item: { type: "string", placeholder: "client.created" },
      required: true,
      hint: "At least one. The document says to enumerate the valid values from " +
        "`GET /webhooks/subscription/event/types`, which `list-webhook-event-types` exposes.",
    },
    {
      key: "verificationToken",
      label: "Verification token",
      type: "secret",
      required: true,
      hint:
        "A secret you generate and store on your endpoint. Practice Better verifies the endpoint " +
        "with it as a one-time handshake before any event is delivered.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      hint: "A description stored on the subscription.",
    },
    {
      key: "autoEnable",
      label: "Auto-enable",
      type: "boolean",
      hint: "Enable the subscription automatically once the endpoint handshake succeeds.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint:
        "An arbitrary JSON object stored with the subscription. The document types this as an " +
        "object without publishing its keys.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "apiVersion", type: "string", label: "API version" },
    { key: "companyId", type: "string", label: "Company ID" },
    { key: "endpointUrl", type: "string", label: "Endpoint URL" },
    { key: "events", type: "array", label: "Subscribed event types" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateModified", type: "string", label: "Last modified at" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request<Record<string, unknown>>(
      "/webhooks/subscription",
      {
        method: "POST",
        body: {
          endpointUrl: input.endpointUrl,
          eventTypes: toList(input.eventTypes),
          verificationToken: input.verificationToken,
          description: input.description,
          autoEnable: input.autoEnable,
          metadata: asOptionalJson<Record<string, unknown>>(input.metadata, "metadata"),
        },
      },
    );
  },
};

export default createWebhookSubscription;
