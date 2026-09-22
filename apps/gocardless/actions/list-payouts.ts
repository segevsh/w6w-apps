import type { ActionDefinition } from "@w6w/types";
import { GoCardlessClient, type ListPage } from "../lib/client.ts";
import {
  currencyParam,
  dateFilterParams,
  dateFilterQuery,
  enumishParam,
  idFilterParam,
  listOutput,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /payouts` — one page of the money GoCardless has actually paid out.
 *
 * A payout is a bank transfer of collected funds to the merchant's own account,
 * and it is a different object from a payment: payments are what was *collected*
 * from customers, payouts are what *arrived*. Reconciling revenue means matching
 * the two, which is why `reference` (the merchant's own) and `payout_type` (how
 * the payout was produced) are filters here.
 *
 * Only settled money appears: a confirmed payment that has not yet been included
 * in a payout is visible in `list-payments` (`paid_out` status) and not here.
 */
interface Input {
  limit?: number;
  after?: string;
  before?: string;
  creditor?: string;
  creditorBankAccount?: string;
  currency?: string;
  status?: string;
  reference?: string;
  payoutType?: string;
  createdAtGt?: string;
  createdAtGte?: string;
  createdAtLt?: string;
  createdAtLte?: string;
}

const listPayouts: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "list-payouts",
  type: "search",
  resource: "payout",
  title: "List Payouts",
  description: "Search the payouts GoCardless has made to this merchant's own bank account.",
  params: [
    ...paginationParams(),
    idFilterParam("creditor", "Creditor ID", "Only payouts from this creditor account."),
    idFilterParam(
      "creditorBankAccount",
      "Creditor bank account ID",
      "Only payouts to this specific bank account (sent as `creditor_bank_account`).",
    ),
    currencyParam(),
    enumishParam(
      "status",
      "Status",
      "GoCardless's own payout `status` values, e.g. `paid`, `pending`, `bounced`.",
    ),
    {
      key: "reference",
      label: "Reference",
      type: "string",
      advanced: true,
      hint: "Your own reference, as set on the payments the payout collected. GoCardless's own " +
        "payout reference is returned on each record.",
    },
    enumishParam(
      "payoutType",
      "Payout type",
      "Sent as `payout_type`. GoCardless's own values describing how the payout was produced " +
        "(e.g. a merchant-initiated or a scheduled payout).",
    ),
    ...dateFilterParams({ prefix: "createdAt", label: "Created", field: "created_at" }),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new GoCardlessClient(ctx).list("payouts", "/payouts", {
      limit: input.limit,
      after: input.after,
      before: input.before,
      creditor: input.creditor,
      creditor_bank_account: input.creditorBankAccount,
      currency: input.currency,
      status: input.status,
      reference: input.reference,
      payout_type: input.payoutType,
      ...dateFilterQuery("created_at", {
        gt: input.createdAtGt,
        gte: input.createdAtGte,
        lt: input.createdAtLt,
        lte: input.createdAtLte,
      }),
    });
  },
};

export default listPayouts;
