import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `GET /v1/kajabi_payments_payouts/{id}` — one payout.
 *
 * The spec declares no `fields[…]` or `include` on this operation, so neither
 * is offered.
 */
interface Input {
  id: string;
}

const payoutGet: ActionDefinition<Input> = {
  key: "payout-get",
  type: "read",
  resource: "payout",
  title: "Get Payout",
  description: "Fetch one Kajabi Payments payout by id.",
  params: [idParam("Payout ID", "`payout-list` returns the ids.")],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/kajabi_payments_payouts/${encodeURIComponent(input.id)}`,
    );
  },
};

export default payoutGet;
