import type { ActionDefinition } from "@w6w/types";
import { compact, HOSTS, json, latLng, MapsClient } from "../lib/client.ts";
import { billingTier, DEFAULT_PLACE_FIELDS } from "../lib/fields.ts";
import { fieldMaskParam, LANGUAGE_PARAM, REGION_PARAM } from "../lib/params.ts";

/**
 * `POST places.googleapis.com/v1/places:searchText` — the Places API (New)
 * text search: "coffee near Shoreditch", "Acme Ltd, Manchester".
 *
 * ## The field mask is mandatory, and it is the price
 *
 * Places refuses a request with no `X-Goog-FieldMask`. That much fails loudly.
 * What does not fail at all is that **the fields you name decide the SKU you
 * are billed at** — adding `places.rating` to a mask returning names and
 * addresses moves every call from Essentials to Enterprise, silently, forever.
 * `*` works and bills at the top tier on every call; Google's own
 * documentation discourages it in production.
 *
 * So the mask is a first-class parameter with a deliberately cheap default,
 * and this action logs the tier each call bills at — see `lib/fields.ts`. A run
 * log that says `Enterprise` on the day somebody added a field is a much
 * cheaper way to find out than an invoice.
 *
 * ## Bias and restriction are different words for different things
 *
 * `locationBias` prefers results near a place; a strong match outside it still
 * wins. `locationRestriction` excludes everything outside, full stop. Reaching
 * for the first when you meant the second is how a "restaurants in this
 * postcode" search returns one in the next city.
 */
const action: ActionDefinition = {
  key: "place-search-text",
  type: "search",
  resource: "place",
  title: "Search places by text",
  description:
    "Text search over Places. The field mask is REQUIRED and decides the billing tier — the " +
    "default here is deliberately cheap, and the tier is logged on every call.",
  params: [
    {
      key: "textQuery",
      label: "Query",
      type: "string",
      required: true,
      default: "",
      hint: "Free text, as somebody would type it into Maps.",
    },
    fieldMaskParam(
      DEFAULT_PLACE_FIELDS,
      "Which fields to return — and therefore which SKU this bills at. `*` bills at the highest " +
        "tier on every call. Adding `places.rating` or `places.regularOpeningHours` moves the " +
        "whole workflow to Enterprise.",
    ),
    {
      key: "includedType",
      label: "Type",
      type: "string",
      default: "",
      hint: "One Places type, e.g. `restaurant`, `pharmacy`.",
    },
    {
      key: "locationBias",
      label: "Bias To",
      type: "string",
      default: "",
      hint: "`lat,lng` — prefers results near here. A strong match elsewhere still wins.",
    },
    {
      key: "biasRadius",
      label: "Bias Radius (m)",
      type: "number",
      default: 5000,
      showIf: { "!=": [{ var: "locationBias" }, ""] },
    },
    {
      key: "locationRestriction",
      label: "Restrict To",
      type: "json",
      default: "",
      advanced: true,
      hint: 'A rectangle, e.g. {"rectangle":{"low":{"latitude":51.5,"longitude":-0.2},' +
        '"high":{"latitude":51.6,"longitude":-0.05}}}. Unlike a bias this EXCLUDES everything ' +
        "outside.",
    },
    { key: "openNow", label: "Open Now", type: "boolean", default: false },
    {
      key: "minRating",
      label: "Minimum Rating",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Filtering on rating does not itself add `places.rating` to the mask — you can " +
        "filter by it without paying to see it.",
    },
    { key: "pageSize", label: "Page Size", type: "number", default: 20 },
    { key: "pageToken", label: "Page Token", type: "string", default: "", advanced: true },
    LANGUAGE_PARAM,
    REGION_PARAM,
  ],
  output: [
    { key: "places", type: "array", label: "Matching places" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "nextPageToken", type: "string", label: "Pass as Page Token for the next page" },
    { key: "billingTier", type: "string", label: "The SKU this call billed at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const textQuery = String(p.textQuery ?? "").trim();
    if (!textQuery) throw new Error("`textQuery` is required");
    const fieldMask = String(p.fieldMask ?? DEFAULT_PLACE_FIELDS).trim() || DEFAULT_PLACE_FIELDS;

    const bias = String(p.locationBias ?? "").trim();
    const body = compact({
      textQuery,
      includedType: p.includedType,
      openNow: p.openNow === true ? true : undefined,
      minRating: Number(p.minRating ?? 0) > 0 ? Number(p.minRating) : undefined,
      pageSize: Math.max(1, Number(p.pageSize ?? 20)),
      pageToken: p.pageToken,
      languageCode: p.languageCode,
      regionCode: p.regionCode,
      locationBias: bias
        ? {
          circle: {
            center: latLng(bias, "locationBias"),
            radius: Math.max(1, Number(p.biasRadius ?? 5000)),
          },
        }
        : undefined,
      locationRestriction: json(p.locationRestriction, "locationRestriction"),
    });

    const result = await new MapsClient(ctx).rpc<{ places?: unknown[]; nextPageToken?: string }>(
      HOSTS.places,
      "/v1/places:searchText",
      { method: "POST", body, fieldMask },
    );

    const places = result?.places ?? [];
    const tier = billingTier(fieldMask);
    // The count and the tier — never the results, which are the caller's query.
    ctx.log("info", "searched Places by text", { count: places.length, billingTier: tier });

    return {
      places,
      count: places.length,
      nextPageToken: result?.nextPageToken,
      billingTier: tier,
    };
  },
};

export default action;
