import type { ActionDefinition } from "@w6w/types";
import { ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
  cancelOption?: string;
  cancelAt?: number;
  endOfTerm?: boolean;
  creditOptionForCurrentTermCharges?: string;
  unbilledChargesOption?: string;
  accountReceivablesHandling?: string;
  refundableCreditsHandling?: string;
  cancelReasonCode?: string;
}

/**
 * `POST /subscriptions/{subscription-id}/cancel_for_items` — cancel a
 * subscription.
 *
 * ## The path is `cancel_for_items`, not `cancel`
 *
 * Under Product Catalog 2.0 the cancel route carries the `_for_items` suffix.
 * `POST /subscriptions/{id}/cancel` is the Product Catalog 1.0 route and is
 * absent from the PC 2.0 OpenAPI document. Chargebee's own sample:
 *
 *   `curl .../api/v2/subscriptions/__test__KyVnZKS5y28bL9/cancel_for_items \
 *        -u {site_api_key}: -d end_of_term="true"`
 *
 * ## Two ways to say "when", and they are not interchangeable
 *
 * `cancel_option` is the current, explicit parameter (`immediately`,
 * `end_of_term`, `specific_date`, `end_of_billing_term`). `end_of_term` is the
 * older boolean, and it is the one Chargebee's own samples still use. Both are
 * accepted by the endpoint. This action exposes both rather than picking one,
 * because a workflow copied from the docs will use the boolean and a workflow
 * written against the current reference will use the enum — but it does not
 * invent a merge rule between them: fill in one.
 *
 * `cancel_at` is required when `cancel_option` is `specific_date`, and is Unix
 * epoch SECONDS.
 *
 * Idempotent: cancelling an already-cancelled subscription converges on the same
 * state rather than doubling anything.
 */
const cancelSubscription: ActionDefinition<Input> = {
  key: "cancel-subscription",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description:
    "Cancel a subscription immediately, at term end or on a specific date, with control over " +
    "prorated credits, unbilled charges and outstanding receivables.",
  idempotent: true,
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
    {
      key: "cancelOption",
      label: "Cancel option",
      type: "select",
      options: [
        { value: "immediately", label: "Immediately" },
        { value: "end_of_term", label: "At the end of the current term" },
        { value: "specific_date", label: "On a specific date" },
        { value: "end_of_billing_term", label: "At the end of the current billing term" },
      ],
      hint:
        "The explicit form. Leave blank if you are using the End of term boolean below instead.",
    },
    {
      key: "endOfTerm",
      label: "End of term",
      type: "boolean",
      hint: "The older boolean form of the same decision — `true` cancels at term end, `false` " +
        "immediately. Use this OR Cancel option, not both.",
    },
    {
      key: "cancelAt",
      label: "Cancel at",
      type: "number",
      hint: "Unix epoch seconds. Required when Cancel option is `specific_date`.",
      validation: { integer: true },
    },
    {
      key: "creditOptionForCurrentTermCharges",
      label: "Credit for current term charges",
      type: "select",
      options: [
        { value: "none", label: "None — issue no credit" },
        { value: "prorate", label: "Prorate — credit the unused portion" },
        { value: "full", label: "Full — credit the whole term" },
      ],
      hint: "Only applies to an immediate cancellation.",
    },
    {
      key: "unbilledChargesOption",
      label: "Unbilled charges",
      type: "select",
      options: [
        { value: "invoice", label: "Invoice them now" },
        { value: "delete", label: "Delete them" },
      ],
    },
    {
      key: "accountReceivablesHandling",
      label: "Outstanding receivables",
      type: "select",
      options: [
        { value: "no_action", label: "No action" },
        { value: "schedule_payment_collection", label: "Schedule payment collection" },
        { value: "write_off", label: "Write off" },
      ],
    },
    {
      key: "refundableCreditsHandling",
      label: "Refundable credits",
      type: "select",
      options: [
        { value: "no_action", label: "No action" },
        { value: "schedule_refund", label: "Schedule a refund" },
      ],
    },
    {
      key: "cancelReasonCode",
      label: "Cancel reason code",
      type: "string",
      hint: "One of the reason codes configured on your site, recorded against the cancellation.",
    },
  ],
  output: [
    { key: "subscription", type: "object", label: "Subscription" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "invoice", type: "object", label: "Invoice raised, if any" },
    { key: "credit_notes", type: "array", label: "Credit notes issued, if any" },
  ],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request(
      `/subscriptions/${pathId(input.subscriptionId)}/cancel_for_items`,
      {
        form: {
          cancel_option: input.cancelOption,
          end_of_term: input.endOfTerm,
          cancel_at: input.cancelAt,
          credit_option_for_current_term_charges: input.creditOptionForCurrentTermCharges,
          unbilled_charges_option: input.unbilledChargesOption,
          account_receivables_handling: input.accountReceivablesHandling,
          refundable_credits_handling: input.refundableCreditsHandling,
          cancel_reason_code: input.cancelReasonCode,
        },
      },
    );
  },
};

export default cancelSubscription;
