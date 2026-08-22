import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HOSTS, latLng, MapsClient } from "../lib/client.ts";
import { billingTier, DEFAULT_PLACE_FIELDS } from "../lib/fields.ts";
import { fieldMaskParam, LANGUAGE_PARAM, REGION_PARAM } from "../lib/params.ts";

/**
 * `POST places.googleapis.com/v1/places:searchNearby` — everything of a given
 * kind within a circle.
 *
 * ## The circle is a restriction, not a bias
 *
 * Unlike text search, `locationRestriction` here is **required** and it is
 * hard: nothing outside the circle is returned, ever. That makes this the right
 * action for "which of our depots are within 10km" and the wrong one for "find
 * me the nearest depot" — if the nearest is 11km away, this returns nothing at
 * all rather than the answer.
 *
 * ## The cap is twenty, and it is not negotiable
 *
 * `maxResultCount` is between 1 and 20, and there is **no paging** on nearby
 * search: no page token comes back. Twenty is the whole answer. A dense area
 * with two hundred cafés gives you twenty of them, chosen by
 * `rankPreference` — `POPULARITY` by default, or `DISTANCE`. Which one is
 * chosen changes which twenty, and a workflow that assumes it saw everything
 * within the radius is wrong in exactly the places where the question mattered.
 *
 * ## Primary type versus type
 *
 * A place has one primary type and several others: a hotel with a restaurant is
 * `lodging` primarily and `restaurant` as well. `includedTypes` matches any of
 * them; `includedPrimaryTypes` matches only what the place mainly is.
 */
const action: ActionDefinition = {
  key: "place-search-nearby",
  type: "search",
  resource: "place",
  title: "Search places nearby",
  description:
    "Places of a given type within a circle. The circle EXCLUDES everything outside it, and the " +
    "cap of 20 results has no paging — twenty is the whole answer.",
  params: [
    {
      key: "location",
      label: "Centre",
      type: "string",
      required: true,
      default: "",
      hint: "`lat,lng` — latitude first.",
    },
    {
      key: "radius",
      label: "Radius (m)",
      type: "number",
      required: true,
      default: 1000,
      hint: "Nothing outside this is returned, even if it is the nearest one.",
    },
    fieldMaskParam(
      DEFAULT_PLACE_FIELDS,
      "Which fields to return — and therefore which SKU this bills at. See `place-search-text`.",
    ),
    {
      key: "includedTypes",
      label: "Types",
      type: "string",
      default: "",
      hint: "Comma-separated Places types. Matches any of a place's types.",
    },
    {
      key: "includedPrimaryTypes",
      label: "Primary Types",
      type: "string",
      default: "",
      advanced: true,
      hint: "Matches only what a place mainly is — a hotel with a restaurant is primarily " +
        "`lodging`.",
    },
    {
      key: "excludedTypes",
      label: "Excluded Types",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "rankPreference",
      label: "Rank By",
      type: "select",
      default: "POPULARITY",
      options: [
        { value: "POPULARITY", label: "Popularity — Google's default" },
        { value: "DISTANCE", label: "Distance — nearest first" },
      ],
      hint: "With a hard cap of 20 and no paging, this decides WHICH twenty you see.",
    },
    {
      key: "maxResultCount",
      label: "Max Results",
      type: "number",
      default: 20,
      hint: "1 to 20. There is no page token — this is the ceiling, not a page size.",
    },
    LANGUAGE_PARAM,
    REGION_PARAM,
  ],
  output: [
    { key: "places", type: "array", label: "Matching places" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "capped", type: "boolean", label: "Hit the ceiling — there may be more, unreachable" },
    { key: "billingTier", type: "string", label: "The SKU this call billed at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const center = latLng(p.location, "location");
    const radius = Number(p.radius ?? 0);
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error("`radius` must be a positive number of metres");
    }
    const fieldMask = String(p.fieldMask ?? DEFAULT_PLACE_FIELDS).trim() || DEFAULT_PLACE_FIELDS;
    const max = Math.min(20, Math.max(1, Number(p.maxResultCount ?? 20)));

    const result = await new MapsClient(ctx).rpc<{ places?: unknown[] }>(
      HOSTS.places,
      "/v1/places:searchNearby",
      {
        method: "POST",
        fieldMask,
        body: compact({
          locationRestriction: { circle: { center, radius } },
          includedTypes: csv(p.includedTypes),
          includedPrimaryTypes: csv(p.includedPrimaryTypes),
          excludedTypes: csv(p.excludedTypes),
          rankPreference: p.rankPreference,
          maxResultCount: max,
          languageCode: p.languageCode,
          regionCode: p.regionCode,
        }),
      },
    );

    const places = result?.places ?? [];
    const tier = billingTier(fieldMask);
    const capped = places.length >= max;
    ctx.log("info", "searched Places nearby", { count: places.length, capped, billingTier: tier });

    return {
      places,
      count: places.length,
      // There is no page token to follow, so saying so is the only warning
      // anybody gets that the answer was truncated.
      capped,
      billingTier: tier,
    };
  },
};

export default action;
