/**
 * `GET /api/v2/customer_memberships/{id}` — one customer's membership.
 *
 * `status` is `active`/`hold`/`completed`/`cancelled`, and when it is
 * `cancelled` the `cancellation_reason` records which of TeamUp's five reasons
 * applies (`upgraded`, `cancelled`, `mistake`, `downgraded`, `no_auto_renew`) —
 * the difference between a churn report and a mistake somebody is fixing.
 *
 * The billing side is here too: `billed_price` is what this customer actually
 * pays and can differ from the plan's own `price`, alongside `discount_code`,
 * `discount_code_makes_free_forever`, `next_billing_date` and
 * `payment_subscription`. `active_hold` carries the hold currently freezing the
 * membership, `is_set_for_cancellation` says whether it will end at the next
 * renewal, and `shared_with` lists the other customers it covers.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { customerMembershipOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "customer-memberships-get",
  type: "read",
  resource: "customer-membership",
  title: "Get Customer Membership",
  description:
    "Fetch one customer's membership by id: status, dates, the plan, billing and any hold (GET " +
    "/api/v2/customer_memberships/{id}).",
  params: [
    idParam("The `id` from List Customer Memberships or Create Customer Membership."),
    ...commonParams(),
  ],
  output: customerMembershipOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/customer_memberships/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
