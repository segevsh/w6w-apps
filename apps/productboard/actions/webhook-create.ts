import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  compact,
  type DataResult,
  ProductboardClient,
  toList,
} from "../lib/client.ts";
import { HTTPS_URL_PATTERN, webhookEventOptions } from "../lib/params.ts";

/**
 * `POST /v2/webhooks` — subscribe to workspace events.
 *
 * Four constraints the vendor's schema enforces, all of which produce a `422`
 * rather than a helpful message:
 *
 *  - **`url` must be `https`** and publicly reachable. The schema carries the
 *    literal pattern `https://.+` and the description bans `localhost`, private
 *    IPs and internal Kubernetes addresses. A tunnelled local endpoint has to be
 *    a real public HTTPS URL.
 *  - **`version` must be `1`.** The enum has exactly one member.
 *  - **`events` must be non-empty and free of duplicates** (`minItems: 1`,
 *    `uniqueItems: true`) and every value must come from the 26-member
 *    `WebhookEventType` enum. It is an array of **objects**, not of strings:
 *    `[{"eventType": "feature.updated"}]`. A bare `["feature.updated"]` is
 *    rejected. This action does the wrapping.
 *  - **`name` is required**, 1–255 characters.
 *
 * ## The outbound notification headers
 *
 * `notification.headers` is where Productboard is told what to send on every
 * outgoing notification so your receiver can authenticate it — today a single
 * `authorization` property carrying a raw value in any scheme (`Bearer …`,
 * `Basic …`, or a bare token, up to 2048 characters). That is a secret *you*
 * mint, travelling outbound: the exact inverse of this App's own credential,
 * which this Action still cannot see and never touches.
 *
 * It is exposed as a pass-through `json` param marked `secret: true`, the same
 * treatment every other vendor-defined free-form object in this app gets
 * (`fields`, `filter`, `relationships`, `metadata`). Two reasons beyond
 * consistency: the vendor declares `headers` as an *object*, so a second header
 * added later needs no change here; and marking the param `secret` is what makes
 * the host mask it in the UI and encrypt it at rest.
 *
 * Productboard never returns this value once written — its
 * `WebhookSubscriptionResponseFields` schema omits it deliberately — so keep
 * your own copy.
 *
 * **Not idempotent.** No idempotency key, so a retry creates a second
 * subscription and your endpoint starts receiving every event twice.
 */
interface Input {
  name: string;
  events: string[] | string;
  url: string;
  notificationHeaders?: unknown;
}

const webhookCreate: ActionDefinition<Input, DataResult> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create webhook",
  description:
    "Subscribe an HTTPS endpoint to Productboard events. Retrying creates a SECOND subscription " +
    "— your endpoint would then receive every event twice.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 255 },
      placeholder: "Feature changes webhook",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      options: webhookEventOptions,
      hint: "At least one, no duplicates. Only these 26 values are accepted.",
    },
    {
      key: "url",
      label: "Notification URL",
      type: "string",
      required: true,
      validation: { pattern: HTTPS_URL_PATTERN, maxLength: 1024 },
      hint: "Must be an https URL and publicly reachable — localhost, private IPs and internal " +
        "cluster addresses are refused. Maximum 1024 characters.",
    },
    {
      key: "notificationHeaders",
      label: "Notification headers",
      type: "json",
      secret: true,
      hint:
        "Optional JSON object of headers Productboard sends on every outgoing notification, so " +
        "your receiver can verify the call came from Productboard. The vendor accepts exactly " +
        "one property today, named `authorization` (lower-case), carrying the raw header value " +
        "in any scheme — Bearer …, Basic …, or a bare token — up to 2048 characters. " +
        "Productboard never returns it once written, so keep your own copy.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Created subscription" }],

  async execute(input, ctx) {
    const events = toList(input.events);
    if (!events || events.length === 0) throw new Error("Select at least one event");

    const data = await new ProductboardClient(ctx).data("/webhooks", {
      method: "POST",
      body: {
        data: {
          fields: {
            name: input.name,
            events: events.map((eventType) => ({ eventType })),
            notification: compact({
              url: input.url,
              // The enum has exactly one member; hard-coding it keeps a caller
              // from inventing a version that does not exist.
              version: 1,
              headers: asOptionalJson<Record<string, unknown>>(
                input.notificationHeaders,
                "Notification headers",
              ),
            }),
          },
        },
      },
    });
    return { data };
  },
};

export default webhookCreate;
