import type { ActionDefinition } from "@w6w/types";
import { WizaClient } from "../lib/client.ts";

interface Input {
  query: string;
}

const searchLocations: ActionDefinition<Input> = {
  key: "search-locations",
  type: "search",
  resource: "location",
  title: "Search Locations",
  description:
    "Resolve a location prefix (3+ characters) to the exact values the prospect search `location` and `company_location` filters accept (GET /api/meta/location_autocomplete). Each result's `bucket` is the filter's `b` value (city, state, country, continent or group) and `key` its `v`.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "At least 3 characters.",
      placeholder: "Toron",
      validation: { minLength: 3 },
    },
  ],
  output: [
    { key: "locations", type: "array", label: "{ key, bucket, count } per match" },
  ],

  async execute(input, ctx) {
    const query = String(input.query ?? "").trim();
    if (query.length < 3) throw new Error("query must be at least 3 characters");
    const body = await new WizaClient(ctx).call("/api/meta/location_autocomplete", {
      query: { query },
    });
    return { locations: Array.isArray(body.data) ? body.data : [] };
  },
};

export default searchLocations;
