import type { ActionDefinition } from "@w6w/types";
import { asNumber, LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/** Read one property. Wraps `GET /v2/properties/{id}` (GetPropertyByIdV2): `wid`, `includeInOut`. */
const action: ActionDefinition = {
  key: "get-property",
  type: "read",
  resource: "property",
  title: "Get a property",
  description: "Show one property: address, contact, price range and its room types.",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", required: true },
    {
      key: "includeInOut",
      label: "Include check-in/out dates",
      type: "boolean",
      hint: "Include the dates available for arrival or departure.",
    },
    {
      key: "websiteId",
      label: "Website ID",
      type: "number",
      hint: "Return text localised for this website (the `wid` query parameter).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Property ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "city", type: "string", label: "City" },
    { key: "country_code", type: "string", label: "Country code" },
    { key: "currency_code", type: "string", label: "Currency" },
    { key: "rooms", type: "array", label: "Room types" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.propertyId, "propertyId");
    return await new LodgifyClient(ctx).request(`/v2/properties/${segment(id)}`, {
      query: {
        includeInOut: p.includeInOut === true ? true : undefined,
        wid: asNumber(p.websiteId),
      },
    });
  },
};

export default action;
