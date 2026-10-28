import type { ActionDefinition } from "@w6w/types";
import { LANGUAGE_PARAM } from "../lib/params.ts";
import { latLng, MapsClient, pointString, query } from "../lib/client.ts";

/**
 * `GET /maps/api/geocode/json?latlng=…` — coordinates to an address.
 *
 * ## It returns a stack of answers, not an answer
 *
 * A single point sits inside a street address, a street, a neighbourhood, a
 * city, a county, a state and a country, and reverse geocoding returns **all of
 * them**, most-specific first. `results[0]` is usually the street address, but
 * for a point in a park, on a motorway, or at sea it is whatever the most
 * specific thing containing that point happens to be — which may be a county.
 *
 * `resultType` is how a workflow asks for what it actually wants. Wanting the
 * postcode and reading `results[0].formatted_address` is how you end up storing
 * a street address in a postcode column.
 *
 * ## Latitude first
 *
 * `lat,lng` — the opposite order from GeoJSON and from most mapping libraries.
 * Swapped coordinates do not error; they return a real address somewhere else
 * entirely, which is why `lib/client.ts` range-checks them.
 */
const action: ActionDefinition = {
  key: "geocode-reverse",
  type: "search",
  resource: "geocode",
  title: "Reverse geocode a point",
  description:
    "Coordinates to addresses. Returns the whole containing stack — street, city, county, " +
    "country — most specific first, so `resultType` is how you ask for the one you want.",
  params: [
    {
      key: "location",
      label: "Location",
      type: "string",
      required: true,
      default: "",
      hint: "`lat,lng` — latitude FIRST, the opposite of GeoJSON. Swapping them does not error.",
    },
    {
      key: "resultType",
      label: "Result Type",
      type: "string",
      default: "",
      hint: "Filter to one level, e.g. `street_address`, `postal_code`, `locality`, `country`. " +
        "Without it you get every level and have to pick.",
    },
    {
      key: "locationType",
      label: "Location Type",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Any" },
        { value: "ROOFTOP", label: "ROOFTOP — surveyed points only" },
        {
          value: "RANGE_INTERPOLATED",
          label: "RANGE_INTERPOLATED — guessed between house numbers",
        },
        { value: "GEOMETRIC_CENTER", label: "GEOMETRIC_CENTER — middle of a street or area" },
        { value: "APPROXIMATE", label: "APPROXIMATE" },
      ],
    },
    LANGUAGE_PARAM,
  ],
  output: [
    { key: "found", type: "boolean", label: "Whether anything matched" },
    { key: "formattedAddress", type: "string", label: "The most specific address" },
    { key: "placeId", type: "string", label: "Stable id for the most specific result" },
    { key: "types", type: "array", label: "What kind of thing the best result is" },
    { key: "count", type: "number", label: "How many levels came back" },
    { key: "results", type: "array", label: "Every level, most specific first" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const point = latLng(p.location, "location");

    const body = await new MapsClient(ctx).legacy<{
      status?: string;
      results?: Array<{ formatted_address?: string; place_id?: string; types?: string[] }>;
    }>(
      "/geocode/json",
      query({
        latlng: pointString(point),
        result_type: p.resultType,
        location_type: p.locationType,
        language: p.languageCode,
      }),
      "Geocoding API",
    );

    const results = body.results ?? [];
    const best = results[0];
    ctx.log("info", "reverse geocoded a point", { levels: results.length, types: best?.types });

    return {
      found: results.length > 0,
      formattedAddress: best?.formatted_address,
      placeId: best?.place_id,
      types: best?.types ?? [],
      count: results.length,
      results,
    };
  },
};

export default action;
