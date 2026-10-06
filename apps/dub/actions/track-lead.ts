import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient, jsonValue } from "../lib/client.ts";

interface Input {
  clickId: string;
  eventName: string;
  customerExternalId: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string;
  mode?: "async" | "wait" | "deferred";
  eventQuantity?: number;
  metadata?: unknown;
}

/** `POST /track/lead`. */
const trackLead: ActionDefinition<Input> = {
  key: "track-lead",
  type: "perform",
  resource: "conversion",
  title: "Track Lead",
  description:
    "Record a lead conversion (a sign-up, trial start…) attributed to a click on a Dub link, and create or match the customer.",
  idempotent: false,
  params: [
    {
      key: "clickId",
      label: "Click ID",
      type: "string",
      required: true,
      hint: "The `dub_id` cookie value captured when the visitor clicked the link.",
    },
    {
      key: "eventName",
      label: "Event name",
      type: "string",
      required: true,
      placeholder: "Sign up",
      validation: { maxLength: 255 },
    },
    {
      key: "customerExternalId",
      label: "Customer external ID",
      type: "string",
      required: true,
      hint: "The customer's unique ID in your system. Later events are attributed through it.",
      validation: { maxLength: 100 },
    },
    { key: "customerName", label: "Customer name", type: "string", validation: { maxLength: 100 } },
    {
      key: "customerEmail",
      label: "Customer email",
      type: "string",
      validation: { maxLength: 100 },
    },
    { key: "customerAvatar", label: "Customer avatar URL", type: "string" },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "async", label: "Async (do not wait)" },
        { value: "wait", label: "Wait until recorded" },
        { value: "deferred", label: "Deferred" },
      ],
      hint: "Defaults to async.",
    },
    {
      key: "eventQuantity",
      label: "Event quantity",
      type: "number",
      hint: "Numeric value of the event, e.g. seats in a trial. Maximum 100.",
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Extra JSON stored with the event. Maximum 10,000 characters.",
    },
  ],
  output: [
    { key: "click", type: "object", label: "The click the lead is attributed to" },
    { key: "link", type: "object", label: "The link that was clicked" },
    { key: "customer", type: "object", label: "The customer" },
  ],

  execute(input, ctx) {
    return new DubClient(ctx).request("POST", "/track/lead", {
      body: compact({ ...input, metadata: jsonValue(input.metadata) }),
    });
  },
};

export default trackLead;
