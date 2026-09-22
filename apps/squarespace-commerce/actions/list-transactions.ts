import type { ActionDefinition } from "@w6w/types";
import { API_V1, SquarespaceClient } from "../lib/client.ts";
import { cursorParam, paginationOutput } from "../lib/params.ts";

/**
 * `GET /1.0/commerce/transactions` — up to 50 transaction documents.
 *
 * ## `orderId` is the reconciliation hook
 *
 * The query parameters here are `cursor`, `modifiedAfter`, `modifiedBefore` and
 * `orderId`, and the last one is the one worth remembering: it returns the
 * `Document` for one specific order, which is how a workflow answers "what
 * actually happened to this order's money" — payments, refunds, processing fees
 * and net amounts — without joining anything. An order's own read carries
 * `paymentState` but not the documents behind it.
 *
 * ## Two of the `paymentGatewayError` values are misspelled by the vendor
 *
 * `TransactionDocument.paymentGatewayError` is documented as `null` or one of
 * `GATEWAY_FEE_PROCEESING_ERROR` (three E's — "PROCEESING"), `GATEWAY_API_PERMISSION_ERROR`
 * and `GATEWAY_DISCONNNECTED` (three N's). Those are transcribed verbatim here
 * and in the README, because a matcher written against the correctly-spelled
 * strings would never fire.
 */
export interface PaginatedTransactionListResponse {
  documents?: Array<Record<string, unknown>>;
  pagination?: { hasNextPage?: boolean; nextPageCursor?: string; nextPageUrl?: string };
}

interface Input {
  cursor?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  orderId?: string;
}

const listTransactions: ActionDefinition<Input, PaginatedTransactionListResponse> = {
  key: "list-transactions",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description:
    "List up to 50 transaction documents, ordered by modified date. Filter by order id to read " +
    "one order's payments, refunds and fees.",
  params: [
    cursorParam(
      "Opaque cursor from the previous page's `pagination.nextPageCursor`.",
    ),
    {
      key: "modifiedAfter",
      label: "Modified after",
      type: "string",
      advanced: true,
      placeholder: "2026-09-01T00:00:00Z",
      hint: "ISO 8601 UTC date-time.",
    },
    {
      key: "modifiedBefore",
      label: "Modified before",
      type: "string",
      advanced: true,
      placeholder: "2026-09-30T23:59:59Z",
      hint: "ISO 8601 UTC date-time.",
    },
    {
      key: "orderId",
      label: "Order id",
      type: "string",
      advanced: true,
      hint: "Return the transaction document for one specific order — the reconciliation read.",
    },
  ],
  output: [paginationOutput, {
    key: "documents",
    type: "array",
    label: "Transaction documents (`id`, `salesOrderId`, `payments`, `total`, " +
      "`paymentGatewayError`, `voided`, …)",
  }],

  execute(input, ctx) {
    return new SquarespaceClient(ctx).get<PaginatedTransactionListResponse>(
      `${API_V1}/commerce/transactions`,
      {
        cursor: input.cursor,
        modifiedAfter: input.modifiedAfter,
        modifiedBefore: input.modifiedBefore,
        orderId: input.orderId,
      },
    );
  },
};

export default listTransactions;
