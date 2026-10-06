import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient, jsonValue } from "../lib/client.ts";

interface Input {
  customerExternalId: string;
  amount: number;
  currency?: string;
  eventName?: string;
  paymentProcessor?: string;
  invoiceId?: string;
  metadata?: unknown;
  leadEventName?: string;
  clickId?: string;
  customerName?: string;
  customerEmail?: string;
  customerAvatar?: string;
}

/** `POST /track/sale`. */
const trackSale: ActionDefinition<Input> = {
  key: "track-sale",
  type: "perform",
  resource: "conversion",
  title: "Track Sale",
  description:
    "Record a sale conversion for a customer, optionally tied to an earlier lead event. For a sale with no prior lead, pass a click ID and the customer details (direct sale tracking).",
  idempotent: false,
  params: [
    {
      key: "customerExternalId",
      label: "Customer external ID",
      type: "string",
      required: true,
      hint: "The customer's unique ID in your system.",
      validation: { maxLength: 100 },
    },
    {
      key: "amount",
      label: "Amount (cents)",
      type: "number",
      required: true,
      hint: "In cents for two-decimal currencies; the whole integer for zero-decimal currencies.",
      validation: { min: 0, integer: true },
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      placeholder: "usd",
      hint: "ISO 4217 code. Defaults to usd; stored converted to USD.",
    },
    {
      key: "eventName",
      label: "Event name",
      type: "string",
      hint: "Defaults to Purchase.",
      validation: { maxLength: 255 },
    },
    {
      key: "paymentProcessor",
      label: "Payment processor",
      type: "select",
      options: [
        "stripe",
        "shopify",
        "polar",
        "paddle",
        "apple",
        "revenuecat",
        "lemonsqueezy",
        "dub",
        "custom",
      ].map((value) => ({ value, label: value })),
      hint: "Defaults to custom.",
    },
    {
      key: "invoiceId",
      label: "Invoice ID",
      type: "string",
      hint: "Idempotency key: only one sale is recorded per invoice ID.",
    },
    {
      key: "leadEventName",
      label: "Lead event name",
      type: "string",
      hint: "Case-sensitive name of the earlier lead event this sale follows.",
    },
    {
      key: "clickId",
      label: "Click ID",
      type: "string",
      hint: "Direct sale tracking only: the `dub_id` cookie value.",
    },
    {
      key: "customerName",
      label: "Customer name",
      type: "string",
      hint: "Direct sale tracking only.",
    },
    {
      key: "customerEmail",
      label: "Customer email",
      type: "string",
      hint: "Direct sale tracking only.",
    },
    {
      key: "customerAvatar",
      label: "Customer avatar URL",
      type: "string",
      hint: "Direct sale tracking only.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Extra JSON stored with the sale. Maximum 10,000 characters.",
    },
  ],
  output: [
    { key: "eventName", type: "string", label: "Event name" },
    { key: "customer", type: "object", label: "The customer" },
    { key: "sale", type: "object", label: "The recorded sale" },
  ],

  execute(input, ctx) {
    return new DubClient(ctx).request("POST", "/track/sale", {
      body: compact({ ...input, metadata: jsonValue(input.metadata) }),
    });
  },
};

export default trackSale;
