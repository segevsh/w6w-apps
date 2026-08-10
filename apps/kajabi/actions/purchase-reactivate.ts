import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `POST /v1/purchases/{id}/reactivate` — restore access.
 *
 * The mirror of `purchase-deactivate`, and it inherits the same asymmetry from
 * the other side. Kajabi: *"Reactivate a purchase by ID, this will not
 * reactivate the subscription."* So restoring access does not restart billing
 * on a subscription that was cancelled — a purchase reactivated after
 * `purchase-cancel-subscription` is access without payment, and the
 * subscription has to be recreated through Kajabi's checkout.
 *
 * ## Not every purchase can be reactivated
 *
 * Kajabi: *"If the product can be reactivated the response will be successful.
 * Otherwise, the response will be an error."* The vendor does not publish the
 * predicate, so this app does not attempt to pre-empt it: the call is made and
 * a genuine failure surfaces as a real error rather than being guessed at
 * locally. The related note on `deactivate` — "for a free purchase, the
 * purchase may be later reactivated" — suggests paid purchases are the
 * constrained case, but that is an inference and is not encoded as a rule.
 *
 * Idempotent: reactivating an already-active purchase converges.
 */
interface Input {
  id: string;
}

const purchaseReactivate: ActionDefinition<Input> = {
  key: "purchase-reactivate",
  type: "perform",
  resource: "purchase",
  title: "Reactivate Purchase",
  description:
    "Restore access to a deactivated purchase. Does not restart a cancelled subscription — " +
    "Kajabi reactivates access only. Not every purchase is reactivatable.",
  idempotent: true,
  params: [idParam("Purchase ID", "`purchase-list` returns the ids.")],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/purchases/${encodeURIComponent(input.id)}/reactivate`,
      { method: "POST" },
    );
  },
};

export default purchaseReactivate;
