import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/** `POST /affiliates/:affiliate_id/favorite` — mark an affiliate as a VIP. Idempotent: sets a flag. */
interface Input {
  affiliateId: string;
  mode?: string;
}

const affiliateFavorite: ActionDefinition<Input> = {
  key: "affiliate-favorite",
  type: "perform",
  resource: "affiliate",
  title: "Favorite Affiliate",
  description: "Mark an affiliate as a favorite / VIP.",
  idempotent: true,
  params: [affiliateIdParam, modeParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post(
      `/affiliates/${encodeId(input.affiliateId)}/favorite`,
      { mode: input.mode },
    );
  },
};

export default affiliateFavorite;
