import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `POST /v1/purchases/{id}/cancel_subscription` — stop the money.
 *
 * ## What it actually does, quoted
 *
 *   > This endpoint cancels the underlying subscription (Stripe, PayPal, or
 *   > Kajabi Payments) associated with the purchase. The purchase will be
 *   > deactivated and the subscription will be cancelled immediately, according
 *   > to the payment provider's cancellation rules.
 *
 * Three things follow, and each matters to a workflow author:
 *
 *  - **It reaches into the payment processor.** This is not a Kajabi-local
 *    flag; it cancels at Stripe, PayPal or Kajabi Payments. There is no undo in
 *    this API, and re-subscribing means a new checkout.
 *  - **It also deactivates the purchase.** So this is the *complete* action for
 *    a cancellation — `purchase-deactivate` afterwards is redundant, and
 *    `purchase-deactivate` alone is the incomplete half that leaves billing
 *    running.
 *  - **"Immediately" is qualified by the provider.** Whether the customer keeps
 *    access to the end of a paid period is the processor's rule, not Kajabi's
 *    and not this app's to predict.
 *
 * Unique among the three purchase operations in declaring a **422**, which is
 * where a provider-side refusal surfaces. `KajabiClient` turns that into a
 * thrown error carrying Kajabi's own `detail` string, which is the part that
 * says why.
 *
 * Idempotent: cancelling an already-cancelled subscription converges.
 */
interface Input {
  id: string;
}

const purchaseCancelSubscription: ActionDefinition<Input> = {
  key: "purchase-cancel-subscription",
  type: "perform",
  resource: "purchase",
  title: "Cancel Purchase Subscription",
  description:
    "Cancel the subscription behind a purchase at the payment provider (Stripe, PayPal or " +
    "Kajabi Payments) and deactivate the purchase. This is the complete cancellation — no " +
    "separate deactivate call is needed. Not reversible through the API.",
  idempotent: true,
  params: [
    idParam(
      "Purchase ID",
      "`purchase-list` returns the ids. Cancels at the payment provider — there is no undo.",
    ),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/purchases/${encodeURIComponent(input.id)}/cancel_subscription`,
      { method: "POST" },
    );
  },
};

export default purchaseCancelSubscription;
