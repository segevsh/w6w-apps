import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/**
 * `POST /affiliates/:affiliate_id/delete` — remove an affiliate user.
 * Idempotent: deleting an already-deleted affiliate leaves the same end
 * state, matching REST `DELETE` semantics.
 */
interface Input {
  affiliateId: string;
  mode?: string;
}

const affiliateDelete: ActionDefinition<Input> = {
  key: "affiliate-delete",
  type: "perform",
  resource: "affiliate",
  title: "Delete Affiliate",
  description: "Delete an affiliate user from the account.",
  idempotent: true,
  params: [affiliateIdParam, modeParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post(
      `/affiliates/${encodeId(input.affiliateId)}/delete`,
      { mode: input.mode },
    );
  },
};

export default affiliateDelete;
