import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, HostawayClient } from "../lib/client.ts";

/**
 * List the account's listings. Wraps `GET /v1/listings`.
 *
 * The docs' own curl example for this endpoint is
 * `https://api.hostaway.com/v1/listings?limit=&offset=&sortOrder=&city=&match=&country=&contactName=&propertyTypeId=`
 * — the parameters below are exactly that table, read verbatim:
 *
 *   - `sortOrder` — "One of: name, nameReversed, order, orderReversed, contactName,
 *     contactNameReversed, latestActivity, latestActivityDesc."
 *   - `match` — "Used to search a listing by listing name."
 *   - `includeResources` — "if includeResources flag is 1 then response objects are
 *     supplied with supplementary resources, default is 0."
 *
 * `specialStatus[]` and the `availabilityDateStart`/`availabilityDateEnd` pair are also
 * documented for this endpoint; they are left out rather than half-exposed (see the
 * README).
 */
const action: ActionDefinition = {
  key: "list-listings",
  type: "search",
  resource: "listing",
  title: "List listings",
  description: "List the account's listings, optionally filtered by city, country, contact " +
    "name, property type or a name search.",
  params: [
    { key: "limit", label: "Limit", type: "number", hint: "Maximum number of items in the list." },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      hint: "Number of items to skip from the beginning of the list (0-based).",
    },
    { key: "city", label: "City", type: "string" },
    { key: "country", label: "Country", type: "string" },
    { key: "contactName", label: "Contact name", type: "string" },
    { key: "propertyTypeId", label: "Property type ID", type: "number" },
    {
      key: "match",
      label: "Name search",
      type: "string",
      hint: "Used to search a listing by listing name.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "", label: "Hostaway default" },
        { value: "name", label: "Name" },
        { value: "nameReversed", label: "Name, reversed" },
        { value: "order", label: "Custom order" },
        { value: "orderReversed", label: "Custom order, reversed" },
        { value: "contactName", label: "Contact name" },
        { value: "contactNameReversed", label: "Contact name, reversed" },
        { value: "latestActivity", label: "Latest activity" },
        { value: "latestActivityDesc", label: "Latest activity, oldest first" },
      ],
    },
    {
      key: "includeResources",
      label: "Include resources",
      type: "boolean",
      hint: "Return supplementary resources instead of the empty arrays they default to.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Listings" },
    { key: "count", type: "number", label: "Total matching listings" },
    { key: "page", type: "number", label: "Page number" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new HostawayClient(ctx).requestPage("/listings", {
      query: {
        limit: asNumber(p.limit),
        offset: asNumber(p.offset),
        city: asText(p.city),
        country: asText(p.country),
        contactName: asText(p.contactName),
        propertyTypeId: asNumber(p.propertyTypeId),
        match: asText(p.match),
        sortOrder: asText(p.sortOrder),
        includeResources: asNumber(p.includeResources),
      },
    });
  },
};

export default action;
