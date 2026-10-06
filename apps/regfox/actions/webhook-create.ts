import type { ActionDefinition } from "@w6w/types";
import { RegfoxClient, toList } from "../lib/client.ts";

/** `POST /v2/public/webhooks` */
const webhookCreate: ActionDefinition<Record<string, unknown>> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a URL to RegFox events. The webhook is created enabled. The response " +
    "is the one place this app returns the signing secret, because the receiver needs it to " +
    "verify the `X-Webconnex-Signature` header; store it, do not log it.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "url", label: "Delivery URL", type: "string", required: true },
    {
      key: "events",
      label: "Events",
      type: "string",
      required: true,
      default: "registration",
      hint: "Comma-separated. The reference shows registration, publish, subscription, coupon, " +
        "inventory_100, registrant_edit, ticket_edit and cancel_order; it publishes no " +
        "complete list.",
    },
    {
      key: "formIds",
      label: "Form IDs",
      type: "string",
      default: "-1",
      hint: "Comma-separated form ids, or -1 for all forms.",
    },
    {
      key: "method",
      label: "HTTP method",
      type: "select",
      default: "POST",
      options: [{ value: "POST", label: "POST" }, { value: "PUT", label: "PUT" }],
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "number",
      hint: "Sent when given; the vendor's own example includes it.",
      validation: { integer: true },
    },
    {
      key: "appKey",
      label: "App key",
      type: "string",
      hint: "Optional self-assigned key echoed in the payload's meta.",
    },
  ],
  output: [{ key: "webhook", type: "object", label: "The created webhook" }],
  async execute(input, ctx) {
    const events = toList(input.events);
    if (events.length === 0) throw new Error("at least one event is required");
    const ids = toList(input.formIds ?? "-1");
    const formIds = ids.length ? ids : ["-1"];
    const forms = formIds.map((f) => {
      const n = Number(f);
      if (!Number.isInteger(n)) throw new Error(`form ids must be integers, got "${f}"`);
      return { formId: n };
    });
    const meta: Record<string, unknown> = { name: input.name };
    if (input.appKey) meta.appKey = input.appKey;
    const body: Record<string, unknown> = {
      forms,
      events,
      method: input.method ?? "POST",
      url: input.url,
      typeId: 1,
      status: 1,
      meta,
    };
    if (input.accountId !== undefined && input.accountId !== null && input.accountId !== "") {
      body.accountId = Number(input.accountId);
    }
    const res = await new RegfoxClient(ctx).call("/webhooks", { method: "POST", body });
    return { webhook: res.data };
  },
};

export default webhookCreate;
