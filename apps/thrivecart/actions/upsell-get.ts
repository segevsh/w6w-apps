import type { ActionDefinition } from "@w6w/types";
import { modeParam, upsellIdParam } from "../lib/params.ts";
import { encodeId, ThriveCartClient } from "../lib/client.ts";

/** `GET /upsells/:upsell_id` — one upsell's definition. */
interface Input {
  upsellId: string;
  mode?: string;
}

const upsellGet: ActionDefinition<Input> = {
  key: "upsell-get",
  type: "read",
  resource: "upsell",
  title: "Get Upsell",
  description: "Fetch one upsell by ID.",
  params: [upsellIdParam, modeParam],
  output: [
    { key: "upsell_id", type: "string", label: "Upsell ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "label", type: "string", label: "Internal label" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(`/upsells/${encodeId(input.upsellId)}`, {
      mode: input.mode,
    });
  },
};

export default upsellGet;
