import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, PrintfulClient } from "../lib/client.ts";
import { itemsParam, recipientParam } from "../lib/params.ts";

interface Input {
  recipient: unknown;
  items: unknown;
  currency?: string;
  locale?: string;
}

/** `POST /shipping/rates` — List the shipping options and rates for a recipient and a set of items. */
const shippingRateCalculate: ActionDefinition<Input> = {
  key: "shipping-rate-calculate",
  type: "perform",
  resource: "shipping",
  title: "Calculate Shipping Rates",
  description: "List the shipping options and rates for a recipient and a set of items.",
  idempotent: true,
  params: [
    recipientParam,
    itemsParam,
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "ISO currency code for the rates, e.g. `USD`.",
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      hint: "Locale for the option names, e.g. `en_US`.",
    },
  ],
  output: [
    {
      key: "rates",
      type: "array",
      label: "Shipping options (id, name, rate, currency, minDeliveryDays, maxDeliveryDays)",
    },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<unknown[]>("POST", "/shipping/rates", {
      body: compact({
        recipient: jsonValue(input.recipient),
        items: jsonValue(input.items),
        currency: input.currency,
        locale: input.locale,
      }),
    });
    return { rates: Array.isArray(result) ? result : [] };
  },
};

export default shippingRateCalculate;
