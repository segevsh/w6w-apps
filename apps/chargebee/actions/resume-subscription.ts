import type { ActionDefinition } from "@w6w/types";
import { ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  subscriptionId: string;
  resumeOption?: string;
  resumeDate?: number;
  chargesHandling?: string;
  unpaidInvoicesHandling?: string;
  paymentInitiator?: string;
}

/**
 * `POST /subscriptions/{subscription-id}/resume` — resume a paused subscription.
 *
 * Like `/pause`, no `_for_items` suffix.
 *
 * `resume_option` has only two documented values here — `immediately` and
 * `specific_date` — a shorter list than pause's four, which is exactly the kind
 * of asymmetry that gets invented away. It is not mirrored.
 *
 * `payment_initiator` (`customer` / `merchant`) exists for strong-customer-
 * authentication rules: a merchant-initiated resumption is exempt from the
 * challenge a customer-initiated one may trigger. It is exposed because getting
 * it wrong is a payment failure, not a cosmetic one.
 *
 * Idempotent: resuming an already-active subscription converges.
 */
const resumeSubscription: ActionDefinition<Input> = {
  key: "resume-subscription",
  type: "perform",
  resource: "subscription",
  title: "Resume Subscription",
  description:
    "Resume a paused subscription immediately or on a date, with control over how charges " +
    "accrued during the pause and any unpaid invoices are handled.",
  idempotent: true,
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
    {
      key: "resumeOption",
      label: "Resume option",
      type: "select",
      options: [
        { value: "immediately", label: "Immediately" },
        { value: "specific_date", label: "On a specific date" },
      ],
    },
    {
      key: "resumeDate",
      label: "Resume date",
      type: "number",
      hint: "Unix epoch seconds. Required when Resume option is `specific_date`.",
      validation: { integer: true },
    },
    {
      key: "chargesHandling",
      label: "Charges accrued while paused",
      type: "select",
      options: [
        { value: "invoice_immediately", label: "Invoice immediately" },
        { value: "add_to_unbilled_charges", label: "Add to unbilled charges" },
      ],
    },
    {
      key: "unpaidInvoicesHandling",
      label: "Unpaid invoices",
      type: "select",
      options: [
        { value: "no_action", label: "No action" },
        { value: "schedule_payment_collection", label: "Schedule payment collection" },
      ],
    },
    {
      key: "paymentInitiator",
      label: "Payment initiator",
      type: "select",
      options: [
        { value: "customer", label: "Customer-initiated" },
        { value: "merchant", label: "Merchant-initiated" },
      ],
      hint:
        "Drives strong-customer-authentication handling. A background workflow resuming on its " +
        "own behalf is merchant-initiated.",
    },
  ],
  output: [
    { key: "subscription", type: "object", label: "Subscription" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "invoice", type: "object", label: "Invoice raised, if any" },
  ],

  execute(input, ctx) {
    return ChargebeeClient.fromConnection(ctx).request(
      `/subscriptions/${pathId(input.subscriptionId)}/resume`,
      {
        form: {
          resume_option: input.resumeOption,
          resume_date: input.resumeDate,
          charges_handling: input.chargesHandling,
          unpaid_invoices_handling: input.unpaidInvoicesHandling,
          payment_initiator: input.paymentInitiator,
        },
      },
    );
  },
};

export default resumeSubscription;
