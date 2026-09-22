import type { ActionDefinition } from "@w6w/types";
import { API_V1, csvIds, MAX_CSV_IDS, SquarespaceClient } from "../lib/client.ts";
import { csvIdsParam } from "../lib/params.ts";

/**
 * `GET /1.0/commerce/transactions/{documentIds}` — specific transaction
 * documents.
 *
 * Comma-separated document ids in the path (up to 50), answering
 * `{documents: [...]}` with no pagination. The ids are the `id` values
 * `list-transactions` returns, or the `salesOrderId` values… note that the route
 * takes the **document** id — an order id goes in `list-transactions`'s
 * `orderId` query parameter instead.
 *
 * The vendor's two misspelled `paymentGatewayError` values
 * (`GATEWAY_FEE_PROCEESING_ERROR`, `GATEWAY_DISCONNNECTED`) come back here
 * verbatim; see `list-transactions` for why a matcher has to spell them the
 * vendor's way.
 */
export interface TransactionListResponse {
  documents?: Array<Record<string, unknown>>;
}

interface Input {
  documentIds: string;
}

const getTransactions: ActionDefinition<Input, TransactionListResponse> = {
  key: "get-transactions",
  type: "read",
  resource: "transaction",
  title: "Get Transactions",
  description: "Retrieve up to 50 specific transaction documents by comma-separated id.",
  params: [
    csvIdsParam(
      "documentIds",
      "Document ids",
      "Transaction document ids, e.g. from List transactions' `id`.",
      MAX_CSV_IDS,
    ),
  ],
  output: [{
    key: "documents",
    type: "array",
    label: "Transaction documents (`id`, `salesOrderId`, `payments`, `total`, `voided`, …)",
  }],

  execute(input, ctx) {
    const documentIds = csvIds(input.documentIds, { max: MAX_CSV_IDS, label: "documentIds" });
    return new SquarespaceClient(ctx).get<TransactionListResponse>(
      `${API_V1}/commerce/transactions/${documentIds}`,
    );
  },
};

export default getTransactions;
