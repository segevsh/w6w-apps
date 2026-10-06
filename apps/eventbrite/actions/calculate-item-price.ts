import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  basePrice: string;
  country: string;
  scopeType: string;
  scopeIdentifier: string;
  absorbFees?: boolean;
  absorbTaxes?: boolean;
  paymentType?: string;
  channel?: string;
}

const action: ActionDefinition<Input> = {
  key: "calculate-item-price",
  type: "read",
  resource: "pricing",
  title: "Calculate Item Price",
  description:
    "Calculate the fees, taxes and total price Eventbrite would charge for a hypothetical base price (POST, but read-only: nothing is created or changed).",
  params: [
    {
      "key": "basePrice",
      "label": "Base price",
      "type": "string",
      "required": true,
      "hint": "Currency and minor-unit amount, e.g. `USD,1000`.",
    },
    {
      "key": "country",
      "label": "Country",
      "type": "string",
      "required": true,
      "hint": "ISO 3166 2-letter payout country, e.g. US.",
    },
    {
      "key": "scopeType",
      "label": "Scope type",
      "type": "select",
      "required": true,
      "default": "organization",
      "options": [
        {
          "value": "organization",
          "label": "organization",
        },
        {
          "value": "event",
          "label": "event",
        },
        {
          "value": "ticket_class",
          "label": "ticket_class",
        },
        {
          "value": "assortment_plan",
          "label": "assortment_plan",
        },
      ],
    },
    {
      "key": "scopeIdentifier",
      "label": "Scope identifier",
      "type": "string",
      "required": true,
      "hint":
        "Organization, event or ticket class ID; for assortment_plan use `package1` or `package2`.",
    },
    {
      "key": "absorbFees",
      "label": "Absorb fees",
      "type": "boolean",
      "hint": "Include fees in the base price instead of adding them on top.",
    },
    {
      "key": "absorbTaxes",
      "label": "Absorb taxes",
      "type": "boolean",
      "hint": "Include taxes in the base price instead of adding them on top.",
    },
    {
      "key": "paymentType",
      "label": "Payment type",
      "type": "select",
      "options": [
        {
          "value": "eventbrite",
          "label": "eventbrite",
        },
        {
          "value": "authnet",
          "label": "authnet",
        },
        {
          "value": "paypal",
          "label": "paypal",
        },
      ],
      "hint": "Defaults to eventbrite.",
    },
    {
      "key": "channel",
      "label": "Channel",
      "type": "select",
      "options": [
        {
          "value": "web",
          "label": "web",
        },
        {
          "value": "atd",
          "label": "atd (mobile)",
        },
      ],
      "hint": "Defaults to web.",
    },
  ],
  output: [
    {
      "key": "item_pricing",
      "type": "object",
      "label": "Item pricing",
    },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = {
      base_price: input.basePrice,
      country: input.country,
      scope: { type: input.scopeType, identifier: input.scopeIdentifier },
    };
    if (input.absorbFees !== undefined) body.absorb_fees = input.absorbFees;
    if (input.absorbTaxes !== undefined) body.absorb_taxes = input.absorbTaxes;
    if (input.paymentType) body.payment_type = input.paymentType;
    if (input.channel) body.channel = input.channel;
    return client.request("/pricing/calculate_price_for_item/", { method: "POST", body });
  },
};

export default action;
