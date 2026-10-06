import type { ActionDefinition } from "@w6w/types";
import { compact, LoopClient } from "../lib/client.ts";

/**
 * Create Webhook.
 *
 * `POST /webhooks`. Topic and trigger must be a pair Loop defines (e.g. topic `return` with trigger `return.closed`). Answers HTTP 201.
 */
interface Input {
  topic: string;
  trigger: string;
  url: string;
  status?: string;
}

const action: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a URL to a Loop event.",
  idempotent: false,
  params: [
    {
      key: "topic",
      label: "Topic",
      type: "select",
      required: true,
      hint: "The event topic.",
      options: [
        { value: "return", label: "return" },
        { value: "return.processing", label: "return.processing" },
        { value: "label", label: "label" },
        { value: "restock", label: "restock" },
        { value: "label.request", label: "label.request" },
        { value: "giftcard", label: "giftcard" },
        { value: "happy.returns.shipment", label: "happy.returns.shipment" },
      ],
    },
    {
      key: "trigger",
      label: "Trigger",
      type: "select",
      required: true,
      hint: "The event within the topic.",
      options: [
        { value: "return.created", label: "return.created" },
        { value: "return.updated", label: "return.updated" },
        { value: "return.closed", label: "return.closed" },
        { value: "return.processing.failed", label: "return.processing.failed" },
        { value: "label.created", label: "label.created" },
        { value: "label.updated", label: "label.updated" },
        { value: "restock.requested", label: "restock.requested" },
        { value: "label.request.issued", label: "label.request.issued" },
        { value: "label.request.cancelled", label: "label.request.cancelled" },
        { value: "giftcard.requested", label: "giftcard.requested" },
        { value: "shipment.processed", label: "shipment.processed" },
      ],
    },
    {
      key: "url",
      label: "Webhook URL",
      type: "string",
      required: true,
      hint: "Where Loop will POST the event.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Default active.",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "trigger", type: "string", label: "Trigger" },
    { key: "url", type: "string", label: "URL" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new LoopClient(ctx).post(
      "/webhooks",
      compact({
        topic: input.topic,
        trigger: input.trigger,
        url: input.url,
        status: input.status,
      }),
    );
  },
};

export default action;
