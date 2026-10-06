import type { ActionDefinition } from "@w6w/types";
import { asNumber, LodgifyClient } from "../lib/client.ts";

/**
 * Rate settings. Wraps `GET /v2/rates/settings` (operationId RateSettings, "Rate's
 * settings"): query `houseId` (optional in the document). Response: bookability, check
 * in/out hours, booking window, advance notice, currency, VAT, fees, taxes, promotions.
 */
const action: ActionDefinition = {
  key: "get-rate-settings",
  type: "read",
  resource: "rate",
  title: "Get rate settings",
  description: "Read a property's rate settings: booking window, notice, currency, VAT, fees, " +
    "taxes and promotions.",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", hint: "The `houseId`." },
  ],
  output: [
    { key: "currency_code", type: "string", label: "Currency" },
    { key: "fees", type: "array", label: "Fees" },
    { key: "taxes", type: "array", label: "Taxes" },
    { key: "promotions", type: "array", label: "Promotions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new LodgifyClient(ctx).request("/v2/rates/settings", {
      query: { houseId: asNumber(p.propertyId) },
    });
  },
};

export default action;
