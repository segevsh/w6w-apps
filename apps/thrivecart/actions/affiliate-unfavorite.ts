import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/** `POST /affiliates/:affiliate_id/unfavorite` — remove the favorite marker. Idempotent. */
interface Input {
  affiliateId: string;
  mode?: string;
}

const affiliateUnfavorite: ActionDefinition<Input> = {
  key: "affiliate-unfavorite",
  type: "perform",
  resource: "affiliate",
  title: "Unfavorite Affiliate",
  description: "Remove the favorite / VIP marker from an affiliate.",
  idempotent: true,
  params: [affiliateIdParam, modeParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post(
      `/affiliates/${encodeId(input.affiliateId)}/unfavorite`,
      { mode: input.mode },
    );
  },
};

export default affiliateUnfavorite;
