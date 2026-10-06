import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toInt, toList } from "../lib/client.ts";

/** `GET /api/client/v2/search/locations` — Look Up Locations. */
interface Input {
  q: string;
  limit?: number;
  types?: unknown;
}

const locationsLookup: ActionDefinition<Input> = {
  key: "locations-lookup",
  type: "read",
  resource: "location",
  title: "Look Up Locations",
  description:
    "Find the city, region, country or postcode values the search `locations` filter accepts. Does not spend credits.",
  params: [
    { key: "q", label: "Query", type: "string", required: true, hint: "Text to look up." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Maximum results to return.",
    },
    {
      key: "types",
      label: "Location types",
      type: "multiselect",
      options: [
        { value: "city-state-country", label: "city-state-country" },
        { value: "state-country", label: "state-country" },
        { value: "city-country", label: "city-country" },
        { value: "country", label: "country" },
        { value: "postcode", label: "postcode" },
      ],
      hint: "A JSON array, or comma / newline separated values.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Matching locations" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/search/locations", {
      query: compact({
        q: need(input.q, "Query"),
        limit: toInt(input.limit, "Limit"),
        types: toList(input.types)?.join(","),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default locationsLookup;
