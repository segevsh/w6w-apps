import { getAction } from "../lib/factory.ts";

/** `GET /v2/public/search/transactions/{id}?product=` */
export default getAction({
  key: "transaction-get",
  segment: "transactions",
  noun: "transaction",
  idKey: "transactionId",
  idLabel: "Transaction ID",
});
