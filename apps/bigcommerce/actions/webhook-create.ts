import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BigCommerceClient, compact } from "../lib/client.ts";

/**
 * `POST /v3/hooks` — subscribe to a store event.
 *
 * Three constraints the vendor states outright, each of which fails at delivery
 * time rather than at create time if you miss it:
 *
 *  - **The destination must be HTTPS on port 443.** "URL must be active, return a
 *    200 response, and be served on port 443. Custom ports aren't currently
 *    supported." A URL on :8443 is accepted here and never delivers.
 *  - **The destination must answer 200.** Anything else counts as a failure and
 *    BigCommerce retries, then eventually deactivates.
 *  - **A subscription deactivates after 90 days of inactivity.** A webhook on a
 *    rare event will switch itself off; re-create or refresh it.
 *
 * `headers` is the documented mechanism for authenticating the callback: whatever
 * you put there is replayed on every delivery, which is how a receiver knows a
 * POST really came from BigCommerce. Only one webhook can be created per call.
 */
interface Input {
  scope: string;
  destination: string;
  isActive?: boolean;
  headers?: unknown;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Subscribe to a store event. The destination must be HTTPS on port 443 and must answer 200.",
  // Creating the same scope + destination twice yields two subscriptions and two
  // deliveries per event; BigCommerce does not deduplicate them.
  idempotent: false,
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "string",
      required: true,
      placeholder: "store/order/created",
      hint: "The event to subscribe to. A trailing `*` subscribes to a whole family, e.g. " +
        "`store/order/*`.",
    },
    {
      key: "destination",
      label: "Destination URL",
      type: "string",
      required: true,
      hint: "Must be HTTPS on port 443 — custom ports are not supported and simply never " +
        "deliver — and must answer 200.",
    },
    {
      key: "isActive",
      label: "Active",
      type: "boolean",
      default: true,
      hint: "A subscription deactivates itself after 90 days with no events.",
    },
    {
      key: "headers",
      label: "Custom headers",
      type: "json",
      placeholder: '{ "X-Callback-Secret": "…" }',
      hint: "Replayed on every delivery. This is how the receiver verifies the call is really " +
        "from BigCommerce.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID" },
    { key: "scope", type: "string", label: "Scope" },
    { key: "destination", type: "string", label: "Destination" },
  ],

  async execute(input, ctx) {
    const body = compact({
      scope: input.scope,
      destination: input.destination,
      is_active: input.isActive,
      headers: asOptionalJson<Record<string, string>>(input.headers, "Custom headers"),
    });
    return await new BigCommerceClient(ctx).v3("/hooks", { method: "POST", body });
  },
};

export default webhookCreate;
