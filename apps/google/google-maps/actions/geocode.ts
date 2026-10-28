import type { ActionDefinition } from "@w6w/types";
import { LANGUAGE_PARAM, REGION_PARAM } from "../lib/params.ts";
import { MapsClient, query } from "../lib/client.ts";

/**
 * `GET /maps/api/geocode/json?address=…` — an address to coordinates.
 *
 * ## `ZERO_RESULTS` is a success
 *
 * Geocoding something that does not exist is not an error. The API answers
 * `200` with `status: "ZERO_RESULTS"` and an empty array, and that is the
 * correct answer to "where is 45 Nowhere Lane". This action returns
 * `found: false` for it rather than throwing, so a workflow can branch on a
 * bad address instead of failing the run.
 *
 * ## `partial_match` is the field nobody reads
 *
 * Google will return a **confident-looking result for an address it had to
 * guess at** — a misspelled street, a house number that does not exist on that
 * street, a town when it wanted a suburb. The only signal is
 * `partial_match: true` on the result, and it is easy to miss because
 * everything else about the response looks normal.
 *
 * This action lifts it to the top level as `partialMatch`, and the caller who
 * cares about delivering something to that address can check it. For a real
 * address decision, `address-validate` is the right action — it exists for
 * exactly this and says what it changed.
 *
 * ## `location_type` is the precision, and it is not the same as confidence
 *
 * `ROOFTOP` is a surveyed point. `RANGE_INTERPOLATED` is a guess between two
 * known house numbers on the same street — usually within a building or two,
 * occasionally on the wrong side of the road. `GEOMETRIC_CENTER` is the middle
 * of a street or a polygon, and `APPROXIMATE` is the middle of a town. All four
 * are returned with the same air of certainty.
 */
const action: ActionDefinition = {
  key: "geocode",
  type: "search",
  resource: "geocode",
  title: "Geocode an address",
  description:
    "Address to coordinates. An address that does not exist is a SUCCESS with no results, and a " +
    "guessed match comes back looking like a real one — both are surfaced.",
  params: [
    {
      key: "address",
      label: "Address",
      type: "string",
      required: true,
      default: "",
      hint: "Free text, as somebody would write it.",
    },
    {
      key: "components",
      label: "Component Filter",
      type: "string",
      default: "",
      advanced: true,
      hint: "Restricts the result, e.g. `country:GB|postal_code:SW1A`. Unlike the address itself " +
        "these are hard constraints, so a result that would violate one is not returned at all.",
    },
    {
      key: "bounds",
      label: "Bias To Bounds",
      type: "string",
      default: "",
      advanced: true,
      hint: "`swLat,swLng|neLat,neLng`. A bias, not a restriction — a strong match outside it " +
        "still wins.",
    },
    LANGUAGE_PARAM,
    REGION_PARAM,
  ],
  output: [
    { key: "found", type: "boolean", label: "Whether anything matched" },
    { key: "location", type: "object", label: "lat/lng of the best result" },
    { key: "formattedAddress", type: "string", label: "Google's own rendering of the address" },
    { key: "placeId", type: "string", label: "Stable id, usable with the Places actions" },
    { key: "locationType", type: "string", label: "ROOFTOP, RANGE_INTERPOLATED, …" },
    { key: "partialMatch", type: "boolean", label: "Google had to guess at part of the input" },
    { key: "results", type: "array", label: "Every result" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const address = String(p.address ?? "").trim();
    if (!address) throw new Error("`address` is required");

    const body = await new MapsClient(ctx).legacy<{
      status?: string;
      results?: Array<{
        formatted_address?: string;
        place_id?: string;
        partial_match?: boolean;
        geometry?: { location?: { lat?: number; lng?: number }; location_type?: string };
      }>;
    }>(
      "/geocode/json",
      query({
        address,
        components: p.components,
        bounds: p.bounds,
        language: p.languageCode,
        region: p.regionCode,
      }),
      "Geocoding API",
    );

    const results = body.results ?? [];
    const best = results[0];
    ctx.log("info", "geocoded an address", {
      results: results.length,
      locationType: best?.geometry?.location_type,
      partialMatch: best?.partial_match === true,
    });

    return {
      found: results.length > 0,
      location: best?.geometry?.location,
      formattedAddress: best?.formatted_address,
      placeId: best?.place_id,
      locationType: best?.geometry?.location_type,
      // Absent on a confident match, which is why it is normalised to a boolean.
      partialMatch: best?.partial_match === true,
      results,
    };
  },
};

export default action;
