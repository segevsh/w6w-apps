import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `GET /api/pricing` — SMS prices per country and network. JSON only (the CSV form is not offered). */
interface Input {
  country?: string;
}

const pricingGet: ActionDefinition<Input> = {
  key: "pricing-get",
  type: "read",
  resource: "account",
  title: "Get SMS Pricing",
  description:
    "Read the account's SMS prices per country and network. Omit the country for every country, which is a large response.",
  params: [
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "ISO 3166-1 alpha-2 code, e.g. DE. Omit for all countries.",
      validation: { pattern: "^[A-Za-z]{2}$" },
    },
  ],
  output: [
    { key: "countCountries", type: "number", label: "Countries returned" },
    { key: "countNetworks", type: "number", label: "Networks returned" },
    { key: "countries", type: "array", label: "Countries with their networks and prices" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("GET", "/pricing", {
      query: { country: input.country?.toUpperCase(), format: "json" },
    });
  },
};

export default pricingGet;
