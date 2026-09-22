import type { ActionDefinition } from "@w6w/types";
import { GoCardlessClient, type ListPage } from "../lib/client.ts";
import {
  dateFilterParams,
  dateFilterQuery,
  enumishParam,
  idFilterParam,
  listOutput,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /refunds` — one page of this merchant's refunds.
 *
 * Filterable by the payment refunded or by the mandate behind it, which are two
 * different questions: `payment` answers "was this charge refunded in full or in
 * part", `mandate` answers "how much has this customer ever been refunded".
 *
 * `refund_type` distinguishes a refund the merchant initiated from one
 * GoCardless produced on its own (for example when a bank reverses a debit), so
 * a reconciliation that treats the two the same will attribute money it never
 * chose to return.
 */
interface Input {
  limit?: number;
  after?: string;
  before?: string;
  payment?: string;
  mandate?: string;
  refundType?: string;
  createdAtGt?: string;
  createdAtGte?: string;
  createdAtLt?: string;
  createdAtLte?: string;
}

const listRefunds: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "list-refunds",
  type: "search",
  resource: "refund",
  title: "List Refunds",
  description: "Search refunds by the payment or mandate refunded, refund type, or creation date.",
  params: [
    ...paginationParams(),
    idFilterParam("payment", "Payment ID", "Only refunds of this payment."),
    idFilterParam("mandate", "Mandate ID", "Only refunds collected against this mandate."),
    enumishParam(
      "refundType",
      "Refund type",
      "Sent as `refund_type`. GoCardless's own values, distinguishing a refund you requested " +
        "from one the bank forced.",
    ),
    ...dateFilterParams({ prefix: "createdAt", label: "Created", field: "created_at" }),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new GoCardlessClient(ctx).list("refunds", "/refunds", {
      limit: input.limit,
      after: input.after,
      before: input.before,
      payment: input.payment,
      mandate: input.mandate,
      refund_type: input.refundType,
      ...dateFilterQuery("created_at", {
        gt: input.createdAtGt,
        gte: input.createdAtGte,
        lt: input.createdAtLt,
        lte: input.createdAtLte,
      }),
    });
  },
};

export default listRefunds;
