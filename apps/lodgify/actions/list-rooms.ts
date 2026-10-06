import type { ActionDefinition } from "@w6w/types";
import { asNumber, LodgifyClient, requireNumber, segment } from "../lib/client.ts";

/**
 * List a property's room types. Wraps `GET /v2/properties/{id}/rooms`
 * (PropertiesApi_v_GetAllRooms_get); `wid` optional. The response is a bare array.
 */
const action: ActionDefinition = {
  key: "list-rooms",
  type: "read",
  resource: "property",
  title: "List a property's room types",
  description: "List the room types of a property, with capacity, amenities and price range. " +
    "Most rentals have a single room type; its id is needed for rates and availability.",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", required: true },
    {
      key: "websiteId",
      label: "Website ID",
      type: "number",
      hint: "Return text localised for this website (the `wid` query parameter).",
    },
  ],
  output: [{ key: "items", type: "array", label: "Room types" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.propertyId, "propertyId");
    return await new LodgifyClient(ctx).list(`/v2/properties/${segment(id)}/rooms`, {
      query: { wid: asNumber(p.websiteId) },
    });
  },
};

export default action;
