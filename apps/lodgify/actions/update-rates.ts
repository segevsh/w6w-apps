import type { ActionDefinition } from "@w6w/types";
import { asJson, LodgifyClient, requireNumber } from "../lib/client.ts";

/**
 * Save rates. Wraps `POST /v1/rates/savewithoutavailability` ("Updates specific
 * rates": "Sets the rates for given property and room type. Will return true if
 * successful, an error message if update fails."). Body: `{property_id, room_type_id,
 * rates[]}` where each rate is `{is_default, start_date, end_date, price_per_day,
 * min_stay, max_stay, price_per_additional_guest, additional_guests_starts_from}`.
 *
 * The `rates` array is passed through as the caller wrote it (documented field names),
 * since every entry carries up to eight fields and the document names no required ones.
 */
const action: ActionDefinition = {
  key: "update-rates",
  type: "perform",
  idempotent: true,
  resource: "rate",
  title: "Save rates",
  description: "Save nightly rates for a property's room type: price, minimum and maximum stay " +
    "per date range.",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", required: true },
    { key: "roomTypeId", label: "Room type ID", type: "number", required: true },
    {
      key: "rates",
      label: "Rates",
      type: "json",
      required: true,
      hint: 'Array of rate entries, e.g. [{"is_default": false, "start_date": "2026-12-20", ' +
        '"end_date": "2027-01-03", "price_per_day": 180, "min_stay": 3, "max_stay": 28}]. ' +
        "Other documented fields: price_per_additional_guest, additional_guests_starts_from.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Saved" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const rates = asJson<unknown[]>(p.rates, "rates");
    if (!Array.isArray(rates) || rates.length === 0) {
      throw new Error("`rates` must be a non-empty array");
    }
    const body = await new LodgifyClient(ctx).request("/v1/rates/savewithoutavailability", {
      method: "POST",
      body: {
        property_id: requireNumber(p.propertyId, "propertyId"),
        room_type_id: requireNumber(p.roomTypeId, "roomTypeId"),
        rates,
      },
    });
    // Documented success body is the boolean `true`.
    if (body === false) throw new Error("Lodgify did not save the rates (answered false)");
    return { ok: true };
  },
};

export default action;
