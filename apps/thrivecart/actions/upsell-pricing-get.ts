import type { ActionDefinition } from "@w6w/types";
import { modeParam, upsellIdParam } from "../lib/params.ts";
import { encodeId, ThriveCartClient } from "../lib/client.ts";

/**
 * `GET /upsells/:upsell_id/pricing_options` — an upsell's price plans. The
 * collection carries no example response, so the object is returned
 * unshaped — see `docs.thrivecart.com` for the current fields.
 */
interface Input {
  upsellId: string;
  mode?: string;
}

const upsellPricingGet: ActionDefinition<Input> = {
  key: "upsell-pricing-get",
  type: "read",
  resource: "upsell",
  title: "Get Upsell Pricing",
  description: "Fetch an upsell's price plans and options.",
  params: [upsellIdParam, modeParam],
  output: [{ key: "data", type: "object", label: "Pricing options" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(`/upsells/${encodeId(input.upsellId)}/pricing_options`, {
      mode: input.mode,
    });
  },
};

export default upsellPricingGet;
