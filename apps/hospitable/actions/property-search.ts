import type { ActionDefinition } from "@w6w/types";
import { HospitableClient } from "../lib/client.ts";

/** `GET /v2/properties/search` — Search properties for availability and pricing on given dates. */
interface Input {
  start_date: string;
  end_date: string;
  adults: number;
  children?: number;
  infants?: number;
  pets?: number;
  latitude?: number;
  longitude?: number;
  site_url?: string;
  include?: string;
}

const propertySearch: ActionDefinition<Input> = {
  key: "property-search",
  type: "search",
  resource: "property",
  title: "Search Properties",
  description:
    "Check every property's availability and total price for a stay (up to 3 years ahead, at most 90 days). Returns all properties with the reason when one is unbookable.",
  params: [
    { key: "start_date", label: "Start date", type: "date", required: true, hint: "YYYY-MM-DD." },
    {
      key: "end_date",
      label: "End date",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD, at most 90 days after the start.",
    },
    {
      key: "adults",
      label: "Adults",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "children", label: "Children", type: "number", validation: { integer: true, min: 0 } },
    { key: "infants", label: "Infants", type: "number", validation: { integer: true, min: 0 } },
    { key: "pets", label: "Pets", type: "number", validation: { integer: true, min: 0 } },
    {
      key: "latitude",
      label: "Latitude",
      type: "number",
      hint: "Send together with Longitude to sort by distance.",
    },
    { key: "longitude", label: "Longitude", type: "number" },
    {
      key: "site_url",
      label: "Direct site URL",
      type: "string",
      hint: "Restrict to properties bookable on one direct-booking site.",
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated related resources. Allowed: listings (needs listing:read), details.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Properties with pricing and availability" }],

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", "/properties/search", {
      query: {
        start_date: input.start_date,
        end_date: input.end_date,
        adults: input.adults,
        children: input.children,
        infants: input.infants,
        pets: input.pets,
        "location[latitude]": input.latitude,
        "location[longitude]": input.longitude,
        site_url: input.site_url,
        include: input.include,
      },
    });
  },
};

export default propertySearch;
