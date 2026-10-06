import type { ActionDefinition } from "@w6w/types";
import { MoonClerkClient } from "../lib/client.ts";
import { countParam, dateParam, formIdParam, offsetParam } from "../lib/params.ts";

interface Input {
  formId?: number;
  checkoutFrom?: string;
  checkoutTo?: string;
  nextPaymentFrom?: string;
  nextPaymentTo?: string;
  status?: string;
  count?: number;
  offset?: number;
}

/**
 * `GET /customers` — "Plans" in the MoonClerk dashboard. All filters combine. The `*_from`
 * dates start at the beginning of that day and the `*_to` dates run through its end (UTC).
 */
const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description:
    "List customers (MoonClerk 'Plans') with subscription, plan, discount and custom-field answers, filtered by form, checkout date, next payment date or subscription status.",
  params: [
    formIdParam,
    dateParam("checkoutFrom", "Checked out from", "Customers created on or after this date."),
    dateParam("checkoutTo", "Checked out to", "Customers created on or before this date."),
    dateParam(
      "nextPaymentFrom",
      "Next payment from",
      "Subscriptions due to bill on or after this date.",
    ),
    dateParam(
      "nextPaymentTo",
      "Next payment to",
      "Subscriptions due to bill on or before this date.",
    ),
    {
      key: "status",
      label: "Subscription status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "canceled", label: "Canceled" },
        { value: "expired", label: "Expired" },
        { value: "past_due", label: "Past due" },
        { value: "pending", label: "Pending" },
        { value: "unpaid", label: "Unpaid" },
      ],
    },
    countParam,
    offsetParam,
  ],
  output: [
    { key: "customers", type: "array", label: "Customers" },
    {
      key: "nextOffset",
      type: "number",
      label: "Offset of the next page, when a full page came back",
    },
  ],

  async execute(input, ctx) {
    const { items, nextOffset } = await new MoonClerkClient(ctx).list(
      "/customers",
      "customers",
      {
        form_id: input.formId,
        checkout_from: input.checkoutFrom,
        checkout_to: input.checkoutTo,
        next_payment_from: input.nextPaymentFrom,
        next_payment_to: input.nextPaymentTo,
        status: input.status,
        count: input.count,
        offset: input.offset,
      },
    );
    return { customers: items, ...(nextOffset !== undefined ? { nextOffset } : {}) };
  },
};

export default customerList;
