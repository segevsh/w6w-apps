import type { ActionDefinition } from "@w6w/types";
import { OneSimpleApiClient } from "../lib/client.ts";

interface Input {
  toCurrency: string;
  fromCurrency?: string;
  fromValue?: number;
}

interface Output {
  from_currency?: string;
  from_value?: number;
  to_currency?: string;
  to_value?: number;
  to_exchange_rate?: number;
  elapsed?: number;
  [key: string]: unknown;
}

/**
 * GET /api/exchange_rate — convert a value between 150+ currencies. Rates
 * blend multiple central-bank and commercial sources; the vendor documents
 * them as midpoint/indicative (not suitable for FX trading).
 *
 * Output fields are inferred from the vendor's documented CSV columns
 * ("from_currency, from_value, to_currency, to_value, to_exchange_rate") —
 * see `take-screenshot.ts` for why that inference is grounded rather than
 * guessed.
 */
const convertCurrency: ActionDefinition<Input, Output> = {
  key: "convert-currency",
  type: "read",
  resource: "information",
  title: "Convert Currency",
  description: "Convert a value from one currency to another using current exchange rates.",
  params: [
    {
      key: "toCurrency",
      label: "To currency",
      type: "string",
      required: true,
      hint: "3-letter currency code, e.g. GBP.",
    },
    {
      key: "fromCurrency",
      label: "From currency",
      type: "string",
      default: "USD",
      hint: "3-letter currency code. Defaults to USD.",
    },
    {
      key: "fromValue",
      label: "Amount",
      type: "number",
      hint: "Defaults to 1, i.e. the plain exchange rate.",
    },
  ],
  output: [
    { key: "to_value", type: "number", label: "Converted amount" },
    { key: "to_exchange_rate", type: "number", label: "Exchange rate applied" },
  ],

  execute(input, ctx) {
    const client = new OneSimpleApiClient(ctx);
    return client.request<Output>("/exchange_rate", {
      query: {
        to_currency: input.toCurrency,
        from_currency: input.fromCurrency,
        from_value: input.fromValue,
      },
    });
  },
};

export default convertCurrency;
