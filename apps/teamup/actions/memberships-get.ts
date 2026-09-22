/**
 * `GET /api/v2/memberships/{id}` — one plan, in full.
 *
 * The fields that matter when a workflow has to reason about money and access:
 *
 *  - `type` is `pack`, `recurring_plan` or `prepaid_plan`, and `duration_unit`
 *    is `days`/`weeks`/`months`;
 *  - `price`, `display_price` and `one_time_fee` describe the charge, and
 *    `use_prorate` says whether a mid-cycle start is prorated;
 *  - `allotment` is what the plan allows and `plans` its payment plans — both
 *    returned as arrays, since the reference publishes no element schema for
 *    either;
 *  - `is_draft` plus `incomplete_reasons` say whether the plan is finished
 *    being set up, and `has_active_members`/`active_member_count` how much it
 *    is in use;
 *  - `purchasable_only_by_provider` and `new_customers_only` are the two
 *    restrictions that decide whether a workflow may sell the plan to a given
 *    customer at all.
 *
 * The money fields are strings, as Django REST Framework (whose error envelope
 * TeamUp returns) serializes decimals.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery, idParam } from "../lib/params.ts";
import { membershipOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  id: number;
}

const action: ActionDefinition<Input> = {
  key: "memberships-get",
  type: "read",
  resource: "membership",
  title: "Get Membership",
  description:
    "Fetch one membership plan by id, with its pricing, duration, allotment and payment plans (GET " +
    "/api/v2/memberships/{id}).",
  params: [
    idParam("The plan `id` from List Memberships."),
    ...commonParams(),
  ],
  output: membershipOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request(`/memberships/${input.id}`, {
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
