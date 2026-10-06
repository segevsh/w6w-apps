import { getAction } from "../lib/factory.ts";

/** `GET /transaction/{id}` — the numeric transaction id (not the reference). */
export default getAction({
  key: "transaction-get",
  title: "Get Transaction",
  description: "Fetch a transaction by its numeric id. To look one up by reference use Verify.",
  resource: "transaction",
  path: "/transaction/{id}",
  idLabel: "Transaction id",
  idHint: "The numeric `id`, e.g. 4099260516.",
  output: [
    { key: "id", type: "number", label: "Transaction id" },
    { key: "status", type: "string", label: "Transaction status" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "customer", type: "object", label: "Customer" },
  ],
});
