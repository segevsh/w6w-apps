import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { listingIdParam, resourceOutput } from "../lib/params.ts";

interface Input {
  listingId: string;
  oldTotal?: number;
  newTotal: number;
}

/**
 * `POST /v1/integration_api/stock/compare_and_set` — set a listing's total available stock,
 * via an optimistic compare-and-set.
 *
 * The stock is set to `newTotal` **only if** its quantity immediately prior to the call equals
 * `oldTotal` — otherwise the command fails rather than silently overwriting a concurrent
 * change. Leave `oldTotal` empty (sent as `null`) for a listing that has no stock defined yet.
 * If `oldTotal` equals `newTotal`, this is a documented no-op: no new stock adjustment is
 * created.
 *
 * `idempotent: true` is deliberately about the *command*, not about calling it twice with the
 * same arguments blindly: a genuine retry of an unchanged `(oldTotal, newTotal)` pair converges
 * to the same stock level and is exactly what compare-and-set exists to make safe.
 */
const stockSet: ActionDefinition<Input> = {
  key: "stock-set",
  type: "perform",
  resource: "stock",
  title: "Set Listing Stock",
  description: "Set a listing's total available stock quantity, guarded by its prior value.",
  idempotent: true,
  params: [
    listingIdParam,
    {
      key: "oldTotal",
      label: "Expected current total",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "The stock quantity the listing must currently have for this to succeed. Leave " +
        "empty if the listing has no stock defined at all.",
    },
    {
      key: "newTotal",
      label: "New total",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).command("/stock/compare_and_set", {
      listingId: input.listingId,
      oldTotal: input.oldTotal ?? null,
      newTotal: input.newTotal,
    });
  },
};

export default stockSet;
