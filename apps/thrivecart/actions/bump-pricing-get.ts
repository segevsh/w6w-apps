import type { ActionDefinition } from "@w6w/types";
import { bumpIdParam, modeParam } from "../lib/params.ts";
import { encodeId, ThriveCartClient } from "../lib/client.ts";

/**
 * `GET /bumps/:bump_id/pricing_options` — a bump offer's price plans. The
 * collection carries no example response, so the object is returned
 * unshaped — see `docs.thrivecart.com` for the current fields.
 */
interface Input {
  bumpId: string;
  mode?: string;
}

const bumpPricingGet: ActionDefinition<Input> = {
  key: "bump-pricing-get",
  type: "read",
  resource: "bump",
  title: "Get Bump Offer Pricing",
  description: "Fetch a bump offer's price plans and options.",
  params: [bumpIdParam, modeParam],
  output: [{ key: "data", type: "object", label: "Pricing options" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(`/bumps/${encodeId(input.bumpId)}/pricing_options`, {
      mode: input.mode,
    });
  },
};

export default bumpPricingGet;
