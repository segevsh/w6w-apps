/**
 * `POST /api/v2/customer_memberships` — give a customer a membership.
 *
 * `customer` and `membership` are required: which customer, and which of the
 * business's plans (`memberships-list`). `start_date` sets when it begins —
 * omit it for a plan whose `begin_on_first_registration` is on, where the clock
 * starts at the first booking instead. `payment_plan` selects one of the plan's
 * own payment plans (the `plans` array on `memberships-get`) when the plan has
 * more than one.
 *
 * The `201` body is the created customer membership — the same shape
 * `customer-memberships-get` returns.
 *
 * **This is the sale**, so it is not idempotent: two calls create two
 * memberships. A membership that needs a payment method on file has no field
 * for one here; TeamUp's reference documents this operation without one, so the
 * card-collecting half of a signup stays in TeamUp's own checkout.
 */
import type { ActionDefinition } from "@w6w/types";
import { compact, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery } from "../lib/params.ts";
import { customerMembershipOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  customer: number;
  membership: number;
  start_date?: string;
  payment_plan?: number;
}

const action: ActionDefinition<Input> = {
  key: "customer-memberships-create",
  type: "perform",
  resource: "customer-membership",
  title: "Create Customer Membership",
  description:
    "Give a customer one of the business's membership plans, with an optional start date and " +
    "payment plan (POST /api/v2/customer_memberships).",
  idempotent: false,
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "membership",
      label: "Membership ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The plan being sold — see List Memberships.",
    },
    {
      key: "start_date",
      label: "Start date",
      type: "string",
      hint: "When it begins. Omit for a plan that starts on first registration.",
    },
    {
      key: "payment_plan",
      label: "Payment plan ID",
      type: "number",
      validation: { integer: true },
      hint: "One of the plan's own payment plans, when it has more than one.",
    },
    ...commonParams(),
  ],
  output: customerMembershipOutput,

  execute(input, ctx) {
    const body = compact({
      customer: input.customer,
      membership: input.membership,
      start_date: input.start_date,
      payment_plan: input.payment_plan,
    });
    return new TeamUpClient(ctx).request("/customer_memberships", {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
