import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /countries` — List the countries (and their states) Printful ships to. */
const countryList: ActionDefinition<Input> = {
  key: "country-list",
  type: "search",
  resource: "country",
  title: "List Countries",
  description: "List the countries (and their states) Printful ships to.",
  params: [],
  output: [
    { key: "countries", type: "array", label: "Countries (code, name, states, region)" },
  ],

  async execute(_input, ctx) {
    const result = await new PrintfulClient(ctx).request<unknown[]>("GET", "/countries");
    return { countries: Array.isArray(result) ? result : [] };
  },
};

export default countryList;
