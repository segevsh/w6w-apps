/**
 * The field mask, which on Places and Routes is **the price control**.
 *
 * Both APIs require an `X-Goog-FieldMask` header naming the response fields you
 * want. Omit it and the request fails. That much is documented and obvious.
 *
 * What is neither obvious nor recoverable is that **the fields you ask for
 * decide the SKU you are billed at**. Places Details, Text Search and Nearby
 * Search each bill at the highest tier any requested field belongs to, so
 * adding `places.rating` to a mask that was returning names and addresses moves
 * every call in that workflow from the Essentials tier to Enterprise. Nothing
 * in the response says so; the bill says so, a month later.
 *
 * `*` works, is convenient, and bills at **Enterprise + Atmosphere** — the most
 * expensive tier — on every single call. Google's own documentation
 * "discourages the use of the wildcard response field mask in production".
 *
 * The tier tables below are transcribed from Google's Place Details reference
 * (developers.google.com/maps/documentation/places/web-service/place-details,
 * read 2026-08-18). They are used to *report* the tier a request will bill at,
 * in the action's own log line — not to block anything. The point is that
 * somebody reading a run log can see the tier change on the day it changes,
 * rather than on the invoice.
 */

/** Places SKU tiers, cheapest first. */
export const TIERS = [
  "Essentials (IDs Only)",
  "Essentials",
  "Pro",
  "Enterprise",
  "Enterprise + Atmosphere",
] as const;

export type Tier = typeof TIERS[number];

const IDS_ONLY = [
  "attributions",
  "id",
  "moved_place",
  "moved_place_id",
  "name",
  "photos",
];

const ESSENTIALS = [
  "addressComponents",
  "addressDescriptor",
  "adrFormatAddress",
  "formattedAddress",
  "location",
  "plusCode",
  "postalAddress",
  "shortFormattedAddress",
  "types",
  "viewport",
];

const PRO = [
  "accessibilityOptions",
  "businessStatus",
  "containingPlaces",
  "displayName",
  "googleMapsLinks",
  "googleMapsUri",
  "iconBackgroundColor",
  "iconMaskBaseUri",
  "openingDate",
  "primaryType",
  "primaryTypeDisplayName",
  "pureServiceAreaBusiness",
  "subDestinations",
  "timeZone",
  "utcOffsetMinutes",
];

const ENTERPRISE = [
  "currentOpeningHours",
  "currentSecondaryOpeningHours",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "priceLevel",
  "priceRange",
  "rating",
  "regularOpeningHours",
  "regularSecondaryOpeningHours",
  "transitStation",
  "userRatingCount",
  "websiteUri",
];

/** Everything else billable — reviews, amenities, generative summaries. */
const ATMOSPHERE = [
  "allowsDogs",
  "curbsidePickup",
  "delivery",
  "dineIn",
  "editorialSummary",
  "evChargeAmenitySummary",
  "evChargeOptions",
  "fuelOptions",
  "generativeSummary",
  "goodForChildren",
  "goodForGroups",
  "goodForWatchingSports",
  "liveMusic",
  "menuForChildren",
  "neighborhoodSummary",
  "parkingOptions",
  "paymentOptions",
  "outdoorSeating",
  "reservable",
  "restroom",
  "reviews",
  "reviewSummary",
  "routingSummaries",
  "servesBeer",
  "servesBreakfast",
  "servesBrunch",
  "servesCocktails",
  "servesCoffee",
  "servesDessert",
  "servesDinner",
  "servesLunch",
  "servesVegetarianFood",
  "servesWine",
  "takeout",
];

const TIER_OF = new Map<string, number>();
[IDS_ONLY, ESSENTIALS, PRO, ENTERPRISE, ATMOSPHERE].forEach((fields, index) => {
  for (const field of fields) TIER_OF.set(field, index);
});

/**
 * The SKU a Places field mask bills at: the highest tier any named field
 * belongs to.
 *
 * A leading `places.` (search responses) or `place.` is stripped, and only the
 * first path segment after that is looked at — `places.location.latitude` is
 * still the `location` field.
 */
export function billingTier(mask: string): Tier {
  const fields = mask.split(",").map((f) => f.trim()).filter(Boolean);
  if (fields.some((f) => f === "*" || f.endsWith(".*"))) {
    // The wildcard buys everything, which means it buys the top tier.
    return TIERS[TIERS.length - 1];
  }
  let highest = 0;
  for (const field of fields) {
    const withoutPrefix = field.replace(/^places?\./, "");
    const head = withoutPrefix.split(".")[0];
    const tier = TIER_OF.get(head);
    // An unrecognised field is not assumed cheap — Google adds fields, and a
    // new one is far more likely to be at the top of the table than the bottom.
    highest = Math.max(highest, tier ?? TIERS.length - 1);
  }
  return TIERS[highest];
}

/**
 * A conservative default mask for the search actions: identity, address and
 * coordinates, which is what a workflow almost always wants, at the Essentials
 * tier rather than at Enterprise.
 *
 * `displayName` is Pro, and it is included anyway — a result set with no
 * readable name is not usable, and pretending otherwise would produce an app
 * whose default nobody keeps.
 */
export const DEFAULT_PLACE_FIELDS =
  "places.id,places.displayName,places.formattedAddress,places.location,places.types";

/** The same set for a single-place lookup, where the response is not wrapped. */
export const DEFAULT_PLACE_DETAIL_FIELDS =
  "id,displayName,formattedAddress,location,types,businessStatus";

/** Routes' mask is not tiered the same way, but it is still mandatory. */
export const DEFAULT_ROUTE_FIELDS =
  "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration," +
  "routes.legs.distanceMeters";

/**
 * The matrix mask, with `status` in it deliberately.
 *
 * Google's own documentation warns to include `status` "to avoid false success
 * indicators" — a matrix element can fail on its own while the HTTP response is
 * a clean 200, and a mask without `status` hides that completely.
 */
export const DEFAULT_MATRIX_FIELDS =
  "originIndex,destinationIndex,duration,distanceMeters,status,condition";
