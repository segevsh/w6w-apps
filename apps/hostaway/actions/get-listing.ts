import type { ActionDefinition } from "@w6w/types";
import { asNumber, HostawayClient, segment } from "../lib/client.ts";

/**
 * Read one listing in full. Wraps `GET /v1/listings/{listingId}`.
 *
 * Documented query parameters, verbatim:
 *
 *   - `includeResources` — "if includeResources flag is 1 then response object is
 *     supplied with supplementary resources, default is 0."
 *   - `attachObjects[]` — "if ?attachObjects[]=bookingEngineUrls is provided, the actual
 *     value of bookingEngineUrls will be returned instead of the empty array default
 *     value". Left out here (see the README): the docs name `bookingEngineUrls` as the
 *     example but do not enumerate the full set of attachable objects.
 *
 * Response: "A listing object." (the documented Listing object — `id`, `propertyTypeId`,
 * `name`, `internalListingName`, `price`, `personCapacity`, `cancellationPolicy`, …).
 */
const action: ActionDefinition = {
  key: "get-listing",
  type: "read",
  resource: "listing",
  title: "Get a listing",
  description: "Show one listing in full.",
  params: [
    {
      key: "listingId",
      label: "Listing ID",
      type: "number",
      required: true,
      hint: "The `id` field of a listing object.",
    },
    {
      key: "includeResources",
      label: "Include resources",
      type: "boolean",
      hint: "Return supplementary resources instead of the empty arrays they default to.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Listing ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "internalListingName", type: "string", label: "Internal name" },
    { key: "propertyTypeId", type: "number", label: "Property type ID" },
    { key: "city", type: "string", label: "City" },
    { key: "country", type: "string", label: "Country" },
    { key: "price", type: "number", label: "Base price" },
    { key: "personCapacity", type: "number", label: "Person capacity" },
    { key: "cancellationPolicy", type: "string", label: "Cancellation policy" },
    { key: "listingAmenities", type: "array", label: "Amenities" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listingId = asNumber(p.listingId);
    if (listingId === undefined) throw new Error("`listingId` is required");
    return await new HostawayClient(ctx).request(`/listings/${segment(listingId)}`, {
      query: { includeResources: asNumber(p.includeResources) },
    });
  },
};

export default action;
