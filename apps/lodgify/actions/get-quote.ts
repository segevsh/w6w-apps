import type { ActionDefinition } from "@w6w/types";
import {
  asNumber,
  asOptionalJson,
  asText,
  LodgifyClient,
  requireNumber,
  requireText,
  segment,
} from "../lib/client.ts";

/**
 * Price a stay. Wraps `GET /v2/quote/{propertyId}` ("Gets a quote"): `arrival`,
 * `departure`, `roomTypes`, `addOns`, `promotionCode`. The document says its generated
 * samples are invalid for this request and gives the wire form instead:
 *
 *   ?roomTypes[0].Id={id}&roomTypes[0].guest_breakdown.adults={n}&...
 *   &addOns[0].Id={id}&addOns[0].Units={n}     ("0 index-based array objects")
 *
 * which is exactly what is built here. The deprecated `roomTypes[].People` is not sent.
 * The response is an array of quotes.
 */
const action: ActionDefinition = {
  key: "get-quote",
  type: "read",
  resource: "quote",
  title: "Get a quote for a stay",
  description: "Price a stay at a property for given dates and party, with optional add-ons " +
    "and promotion code.",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", required: true },
    { key: "arrival", label: "Arrival", type: "date", required: true },
    { key: "departure", label: "Departure", type: "date", required: true },
    { key: "roomTypeId", label: "Room type ID", type: "number", required: true },
    { key: "adults", label: "Adults", type: "number", default: 1 },
    { key: "children", label: "Children", type: "number" },
    { key: "infants", label: "Infants", type: "number" },
    { key: "pets", label: "Pets", type: "number" },
    {
      key: "addOns",
      label: "Add-ons",
      type: "json",
      hint: 'Optional array of {"id": 5, "units": 2}.',
    },
    { key: "promotionCode", label: "Promotion code", type: "string" },
  ],
  output: [{ key: "items", type: "array", label: "Quotes" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw: Array<[string, string]> = [];
    raw.push(["roomTypes[0].Id", String(requireNumber(p.roomTypeId, "roomTypeId"))]);
    const party: Array<[string, unknown]> = [
      ["adults", asNumber(p.adults) ?? 1],
      ["children", asNumber(p.children)],
      ["infants", asNumber(p.infants)],
      ["pets", asNumber(p.pets)],
    ];
    for (const [name, value] of party) {
      if (value !== undefined) raw.push([`roomTypes[0].guest_breakdown.${name}`, String(value)]);
    }
    const addOns = asOptionalJson<Array<{ id: number; units?: number }>>(p.addOns, "addOns");
    (addOns ?? []).forEach((addOn, i) => {
      raw.push([`addOns[${i}].Id`, String(requireNumber(addOn.id, "addOns[].id"))]);
      if (addOn.units !== undefined) raw.push([`addOns[${i}].Units`, String(addOn.units)]);
    });
    return await new LodgifyClient(ctx).list(
      `/v2/quote/${segment(requireNumber(p.propertyId, "propertyId"))}`,
      {
        query: {
          arrival: requireText(p.arrival, "arrival"),
          departure: requireText(p.departure, "departure"),
          promotionCode: asText(p.promotionCode),
        },
        rawQuery: raw,
      },
    );
  },
};

export default action;
