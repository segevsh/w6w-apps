import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, SimpleTextingClient } from "../lib/client.ts";
import { requestPerSecLimitParam, webhookTriggerOptions } from "../lib/params.ts";

/**
 * `POST /api/webhooks` — "Create a Webhook".
 *
 * Answers `201` with `{id}` — the subscription's hexadecimal ID, which is what
 * update and delete take.
 *
 * ## Eight triggers in one call
 *
 * `triggers` is required and carries one or more of the platform's eight events
 * (incoming/outgoing message, delivery and non-delivery reports, unsubscribe,
 * conversation opened/closed, contact phone changed). They are offered as a
 * multi-select of the schema's own enum rather than as free text, because a
 * misspelled trigger is accepted by the shape of the request and simply never
 * fires.
 *
 * The API also exposes three unauthenticated report endpoints
 * (`/report/delivery`, `/report/incoming`, `/report/unsubscribe`) that create a
 * webhook for exactly one of these triggers and need no credential — a shape
 * meant for a browser or a form, not for a workflow. This authenticated
 * endpoint covers all eight, and this app uses only it. Those three operations
 * are deliberately outside this build; see the README.
 *
 * ## `requestPerSecLimit` is a ceiling on deliveries, not on API calls
 *
 * "The maximum number of requests that can be sent within a second" — the rate
 * at which SimpleTexting delivers to *your* URL, capped at 25. It is unrelated
 * to the API's own limits, which the vendor publishes nowhere.
 *
 * ## Not idempotent, and there is no key
 *
 * Unlike Apify's webhook endpoint, this one declares no idempotency key, so the
 * runtime is not told a retry is free: a duplicated webhook is every event
 * delivered twice, forever, with nothing in the payload to notice it by.
 * `idempotent: false` is the honest declaration. The duplicate that results is
 * visible in `webhook-list` and removable with `webhook-delete`.
 *
 * ## The documented `400` describes a success body
 *
 * The document declares this endpoint's `400` with the same `ObjectIdDto`
 * schema as its `201` — an obvious copy-paste in the vendor's spec, since a
 * failure cannot answer an ID. Nothing is inferred from that here: a `400`
 * surfaces as an error, with the vendor's own `problem+json` message when the
 * body carries one.
 */
interface Input {
  url: string;
  triggers: string[];
  requestPerSecLimit?: number;
  accountPhone?: string;
  contactPhone?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a URL to SimpleTexting message events.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Target URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/simpletexting",
      hint: "SimpleTexting POSTs to this URL when a subscribed event fires. It must be publicly " +
        "reachable — the endpoint does not authenticate to it beyond an optional token in the URL.",
    },
    {
      key: "triggers",
      label: "Triggers",
      type: "multiselect",
      required: true,
      options: webhookTriggerOptions,
      hint: "At least one event. A trigger that is not on this list will never fire.",
    },
    requestPerSecLimitParam,
    {
      key: "accountPhone",
      label: "Limit to sending number",
      type: "string",
      placeholder: "8005551234",
      hint:
        "Optional: only events for this account number reach the URL. Blank means every number " +
        "on the account.",
    },
    {
      key: "contactPhone",
      label: "Limit to contact",
      type: "string",
      placeholder: "1234567890",
      hint: "Optional: only events for this contact's phone number reach the URL.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID (hexadecimal)" },
  ],

  execute(input, ctx) {
    const triggers = asStringArray(input.triggers);
    if (!triggers?.length) throw new Error("At least one trigger is required");

    ctx.log("info", "creating a SimpleTexting webhook", { triggers: triggers.length });
    return new SimpleTextingClient(ctx).json("/api/webhooks", {
      method: "POST",
      body: compact({
        url: input.url,
        triggers,
        requestPerSecLimit: input.requestPerSecLimit,
        accountPhone: input.accountPhone,
        contactPhone: input.contactPhone,
      }),
    });
  },
};

export default webhookCreate;
