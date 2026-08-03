import type { ActionDefinition } from "@w6w/types";
import { ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
  pauseOption?: string;
  pauseDate?: number;
  skipBillingCycles?: number;
  resumeDate?: number;
  unbilledChargesHandling?: string;
  invoiceDunningHandling?: string;
}

/**
 * `POST /subscriptions/{subscription-id}/pause` — pause a subscription.
 *
 * Unlike cancel and update, this path carries NO `_for_items` suffix — it is
 * `/pause` in both catalog versions. Guessing at symmetry here would produce a
 * 404, so the path is taken from the OpenAPI document rather than inferred.
 *
 * A paused subscription does not renew and is not billed while paused. Two ways
 * to say when it comes back:
 *
 *   - `resume_date` — an explicit date, and
 *   - `skip_billing_cycles` — resume after N cycles, which is what
 *     `pause_option: billing_cycles` means.
 *
 * `pause_date` is required when `pause_option` is `specific_date`. All three
 * dates are Unix epoch SECONDS.
 *
 * The enum values are lowercase, as the reference's parameter listing gives them
 * (`immediately`, `end_of_term`, `specific_date`, `billing_cycles`). Some of
 * Chargebee's older curl samples show them uppercased; the API tolerates that,
 * but this App sends the documented form.
 *
 * Idempotent: pausing an already-paused subscription converges rather than
 * stacking pauses.
 */
const pauseSubscription: ActionDefinition<Input> = {
  key: "pause-subscription",
  type: "perform",
  resource: "subscription",
  title: "Pause Subscription",
  description:
    "Pause a subscription immediately, at term end or on a date, optionally scheduling when it " +
    "resumes.",
  idempotent: true,
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
    {
      key: "pauseOption",
      label: "Pause option",
      type: "select",
      options: [
        { value: "immediately", label: "Immediately" },
        { value: "end_of_term", label: "At the end of the current term" },
        { value: "specific_date", label: "On a specific date" },
        {
          value: "billing_cycles",
          label: "At term end, resuming after N billing cycles",
        },
      ],
    },
    {
      key: "pauseDate",
      label: "Pause date",
      type: "number",
      hint: "Unix epoch seconds. Required when Pause option is `specific_date`.",
      validation: { integer: true },
    },
    {
      key: "skipBillingCycles",
      label: "Skip billing cycles",
      type: "number",
      hint: "Number of cycles to skip before resuming. Goes with Pause option `billing_cycles`.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "resumeDate",
      label: "Resume date",
      type: "number",
      hint: "Unix epoch seconds. Schedules an automatic resumption.",
      validation: { integer: true },
    },
    {
      key: "unbilledChargesHandling",
      label: "Unbilled charges",
      type: "select",
      options: [
        { value: "no_action", label: "No action — leave them unbilled" },
        { value: "invoice", label: "Invoice them now" },
      ],
    },
    {
      key: "invoiceDunningHandling",
      label: "Dunning on unpaid invoices",
      type: "select",
      options: [
        { value: "continue", label: "Continue dunning" },
        { value: "stop", label: "Stop dunning while paused" },
      ],
    },
  ],
  output: [
    { key: "subscription", type: "object", label: "Subscription" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "invoice", type: "object", label: "Invoice raised, if any" },
  ],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request(
      `/subscriptions/${pathId(input.subscriptionId)}/pause`,
      {
        form: {
          pause_option: input.pauseOption,
          pause_date: input.pauseDate,
          skip_billing_cycles: input.skipBillingCycles,
          resume_date: input.resumeDate,
          unbilled_charges_handling: input.unbilledChargesHandling,
          invoice_dunning_handling: input.invoiceDunningHandling,
        },
      },
    );
  },
};

export default pauseSubscription;
