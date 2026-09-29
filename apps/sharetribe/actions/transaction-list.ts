import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { createdAtRangeParams, includeParam, listOutput, paginationParams } from "../lib/params.ts";

interface Input {
  userId?: string;
  customerId?: string;
  providerId?: string;
  listingId?: string;
  lastTransitions?: string;
  processNames?: string;
  states?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  sort?: string;
  include?: string;
  page?: number;
  perPage?: number;
}

/**
 * `GET /v1/integration_api/transactions/query` — search marketplace transactions.
 *
 * `states`/`lastTransitions`/`processNames` are left as free-text comma lists rather than a
 * `select` — a Sharetribe marketplace can run more than one custom transaction process at once
 * (each with its own process-specific `state/*`/`transition/*` names), so there is no fixed,
 * globally-correct enum for these to offer.
 *
 * `hasBooking`/`hasStockReservation`/`hasPayin`/`hasMessage`/`bookingStates`/
 * `stockReservationStates`/`bookingStart`/`bookingEnd` and the `prot_*`/`meta_*` extended-data
 * filters are not exposed as static params, for the same reason `listing-list` leaves out
 * geolocation search — they are process- and schema-specific, and several combine with
 * non-default sorting to disable pagination past 10,000 results (per the vendor's own
 * "Pagination limits for transaction queries" note).
 */
const transactionList: ActionDefinition<Input> = {
  key: "transaction-list",
  type: "search",
  resource: "transaction",
  title: "List Transactions",
  description: "Query marketplace transactions, sorted by createdAt (newest first) by default.",
  params: [
    { key: "userId", label: "User ID (customer or provider)", type: "string" },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "providerId", label: "Provider ID", type: "string" },
    { key: "listingId", label: "Listing ID", type: "string" },
    {
      key: "lastTransitions",
      label: "Last transitions",
      type: "string",
      hint: "Comma-separated transition names from your transaction process, e.g. " +
        '"transition/request,transition/accept".',
    },
    { key: "processNames", label: "Process names", type: "string", hint: "Comma-separated." },
    { key: "states", label: "States", type: "string", hint: "Comma-separated process states." },
    ...createdAtRangeParams(),
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "createdAt",
      hint: "Comma-separated, up to 3 of: createdAt, lastTransitionedAt, lastMessageAt, " +
        'bookingStart, bookingEnd, or a prot_*/meta_* long field. Prefix with "-" to reverse.',
    },
    includeParam,
    ...paginationParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).query("/transactions/query", {
      userId: input.userId,
      customerId: input.customerId,
      providerId: input.providerId,
      listingId: input.listingId,
      lastTransitions: input.lastTransitions,
      processNames: input.processNames,
      states: input.states,
      createdAtStart: input.createdAtStart,
      createdAtEnd: input.createdAtEnd,
      sort: input.sort,
      include: input.include,
      page: input.page,
      perPage: input.perPage,
    });
  },
};

export default transactionList;
