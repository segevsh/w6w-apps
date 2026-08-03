import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `POST /v1/purchases/{id}/deactivate` — revoke access, **without** stopping billing.
 *
 * ## The sharpest edge in this API, in the vendor's own words
 *
 * Kajabi's description of this endpoint:
 *
 *   > Deactivate a purchase by ID, this will not cancel the subscription. Use
 *   > the `cancel_subscription` endpoint to cancel the subscription. Otherwise,
 *   > the purchase will be deactivated and the subscription will remain active.
 *
 * So the intuitive workflow — "the member cancelled, deactivate their purchase"
 * — **keeps charging their card** while removing what they were paying for.
 * That is a billing incident, not a bug in a workflow, and it is reachable in
 * one step from a plausible action name. Hence the warning in the description
 * as well as here: an operator picking actions from a list should not have to
 * open the source to find this out.
 *
 * Use `purchase-cancel-subscription` when money should stop. Use this one when
 * access should stop but billing is handled elsewhere — an external payment
 * processor, a manual refund, a comp being withdrawn.
 *
 * ## Reactivation is conditional
 *
 * Kajabi notes: "For a free purchase, the purchase may be later reactivated."
 * The qualifier is theirs. `purchase-reactivate` may or may not work on a given
 * purchase — the vendor says the response distinguishes the two cases, and this
 * app surfaces the error rather than predicting it.
 *
 * Idempotent: deactivating an already-deactivated purchase converges.
 */
interface Input {
  id: string;
}

const purchaseDeactivate: ActionDefinition<Input> = {
  key: "purchase-deactivate",
  type: "perform",
  resource: "purchase",
  title: "Deactivate Purchase",
  description:
    "Revoke access to a purchase. WARNING — Kajabi does not cancel the subscription: the " +
    "customer keeps being billed. Use `purchase-cancel-subscription` if payment should stop.",
  idempotent: true,
  params: [
    idParam(
      "Purchase ID",
      "`purchase-list` returns the ids. If this purchase has a live subscription, deactivating " +
        "it leaves that subscription billing.",
    ),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/purchases/${encodeURIComponent(input.id)}/deactivate`,
      { method: "POST" },
    );
  },
};

export default purchaseDeactivate;
