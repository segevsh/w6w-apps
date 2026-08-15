import type { ActionDefinition } from "@w6w/types";
import { downsellIdParam, modeParam } from "../lib/params.ts";
import { encodeId, ThriveCartClient } from "../lib/client.ts";

/**
 * `GET /downsells/:downsell_id/pricing_options` — a downsell's price plans.
 * The collection carries no example response, so the object is returned
 * unshaped — see `docs.thrivecart.com` for the current fields.
 */
interface Input {
  downsellId: string;
  mode?: string;
}

const downsellPricingGet: ActionDefinition<Input> = {
  key: "downsell-pricing-get",
  type: "read",
  resource: "downsell",
  title: "Get Downsell Pricing",
  description: "Fetch a downsell's price plans and options.",
  params: [downsellIdParam, modeParam],
  output: [{ key: "data", type: "object", label: "Pricing options" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(
      `/downsells/${encodeId(input.downsellId)}/pricing_options`,
      { mode: input.mode },
    );
  },
};

export default downsellPricingGet;
