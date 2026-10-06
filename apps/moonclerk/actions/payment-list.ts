import type { ActionDefinition } from "@w6w/types";
import { MoonClerkClient } from "../lib/client.ts";
import { countParam, dateParam, formIdParam, offsetParam } from "../lib/params.ts";

interface Input {
  formId?: number;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  count?: number;
  offset?: number;
}

/**
 * `GET /payments`. Amounts are integer cents. `date_from` starts at the beginning of the day and
 * `date_to` runs through its end (UTC). The vendor's own example `status=active` is not a valid
 * payment status; the documented ones are successful, refunded and failed.
 */
const paymentList: ActionDefinition<Input> = {
  key: "payment-list",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description:
    "List payments with amount, Stripe fee, refunded amount and Stripe references, filtered by form, customer, charge date or status.",
  params: [
    formIdParam,
    {
      key: "customerId",
      label: "Customer ID",
      type: "number",
      hint: "Only payments of this MoonClerk customer (plan).",
      validation: { integer: true },
    },
    dateParam("dateFrom", "Charged from", "Payments charged on or after this date."),
    dateParam("dateTo", "Charged to", "Payments charged on or before this date."),
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "successful", label: "Successful" },
        { value: "refunded", label: "Refunded" },
        { value: "failed", label: "Failed" },
      ],
    },
    countParam,
    offsetParam,
  ],
  output: [
    { key: "payments", type: "array", label: "Payments" },
    {
      key: "nextOffset",
      type: "number",
      label: "Offset of the next page, when a full page came back",
    },
  ],

  async execute(input, ctx) {
    const { items, nextOffset } = await new MoonClerkClient(ctx).list("/payments", "payments", {
      form_id: input.formId,
      customer_id: input.customerId,
      date_from: input.dateFrom,
      date_to: input.dateTo,
      status: input.status,
      count: input.count,
      offset: input.offset,
    });
    return { payments: items, ...(nextOffset !== undefined ? { nextOffset } : {}) };
  },
};

export default paymentList;
