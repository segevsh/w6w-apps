import type { ActionDefinition } from "@w6w/types";
import { LodgifyClient, requireNumber, requireText } from "../lib/client.ts";

/**
 * Nightly rates. Wraps `GET /v2/rates/calendar` (operationId RatesCalendar, "Nightly
 * rates"): `houseId`, `roomTypeId`, `startDate`, `endDate` are all required. Response:
 * `{calendar_items[{date, is_default, prices[]}], rate_settings}`.
 */
const action: ActionDefinition = {
  key: "get-rates-calendar",
  type: "read",
  resource: "rate",
  title: "Get nightly rates",
  description: "Read the nightly rates calendar of a property's room type, with the rate " +
    "settings (fees, taxes, promotions) that apply.",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", required: true },
    { key: "roomTypeId", label: "Room type ID", type: "number", required: true },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      required: true,
      hint: "Rates start from this night (inclusive).",
    },
    {
      key: "endDate",
      label: "End date",
      type: "date",
      required: true,
      hint: "Rates run to this night (inclusive).",
    },
  ],
  output: [
    { key: "calendar_items", type: "array", label: "Nightly rate entries" },
    { key: "rate_settings", type: "object", label: "Rate settings" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new LodgifyClient(ctx).request("/v2/rates/calendar", {
      query: {
        houseId: requireNumber(p.propertyId, "propertyId"),
        roomTypeId: requireNumber(p.roomTypeId, "roomTypeId"),
        startDate: requireText(p.startDate, "startDate"),
        endDate: requireText(p.endDate, "endDate"),
      },
    });
  },
};

export default action;
