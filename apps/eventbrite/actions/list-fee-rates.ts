import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  country: string;
  currency: string;
  plan?: string;
  paymentType?: string;
  channel?: string;
  itemType?: string;
  continuation?: string;
}

const action: ActionDefinition<Input> = {
  key: "list-fee-rates",
  type: "search",
  resource: "pricing",
  title: "List Fee Rates",
  description:
    "List Eventbrite pricing fee rates for a country and currency, optionally narrowed by plan, payment type, channel and item type.",
  params: [
    {
      "key": "country",
      "label": "Country",
      "type": "string",
      "required": true,
      "hint": "ISO 3166 alpha-2 code.",
    },
    {
      "key": "currency",
      "label": "Currency",
      "type": "string",
      "required": true,
      "hint": "ISO 4217 code, e.g. USD.",
    },
    {
      "key": "plan",
      "label": "Plan",
      "type": "select",
      "options": [
        {
          "value": "any",
          "label": "any",
        },
        {
          "value": "package1",
          "label": "package1",
        },
        {
          "value": "package2",
          "label": "package2",
        },
      ],
    },
    {
      "key": "paymentType",
      "label": "Payment type",
      "type": "select",
      "options": [
        {
          "value": "any",
          "label": "any",
        },
        {
          "value": "eventbrite",
          "label": "eventbrite",
        },
        {
          "value": "authnet",
          "label": "authnet",
        },
        {
          "value": "moneris",
          "label": "moneris",
        },
        {
          "value": "paypal",
          "label": "paypal",
        },
        {
          "value": "google",
          "label": "google",
        },
        {
          "value": "manual",
          "label": "manual",
        },
        {
          "value": "free",
          "label": "free",
        },
        {
          "value": "offline",
          "label": "offline",
        },
        {
          "value": "cash",
          "label": "cash",
        },
        {
          "value": "check",
          "label": "check",
        },
        {
          "value": "invoice",
          "label": "invoice",
        },
      ],
    },
    {
      "key": "channel",
      "label": "Channel",
      "type": "select",
      "options": [
        {
          "value": "any",
          "label": "any",
        },
        {
          "value": "atd",
          "label": "atd",
        },
        {
          "value": "web",
          "label": "web",
        },
      ],
    },
    {
      "key": "itemType",
      "label": "Item type",
      "type": "select",
      "options": [
        {
          "value": "any",
          "label": "any",
        },
        {
          "value": "ticket",
          "label": "ticket",
        },
        {
          "value": "product",
          "label": "product",
        },
      ],
    },
    {
      "key": "continuation",
      "label": "Continuation token",
      "type": "string",
    },
  ],
  output: [
    {
      "key": "fee_rates",
      "type": "array",
      "label": "Fee rates",
    },
    {
      "key": "pagination",
      "type": "object",
      "label": "Pagination",
    },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/pricing/fee_rates", {
      query: {
        country: input.country,
        currency: input.currency,
        plan: input.plan,
        payment_type: input.paymentType,
        channel: input.channel,
        item_type: input.itemType,
        continuation: input.continuation,
      },
    });
  },
};

export default action;
