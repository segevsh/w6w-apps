import { getAction } from "../lib/factory.ts";

/**
 * `GET /transaction/verify/{reference}`. `data.status` is the transaction's own state
 * (`success`, `failed`, `abandoned`, ...) — a 200 envelope with `status:true` only means the
 * lookup worked, so check `data.status === "success"` before fulfilling an order.
 */
export default getAction({
  key: "transaction-verify",
  title: "Verify Transaction",
  description:
    "Look a transaction up by reference. Check `status` is `success` (and the amount/currency) " +
    "before giving value; the call itself succeeding does not mean the payment did.",
  resource: "transaction",
  path: "/transaction/verify/{id}",
  idLabel: "Reference",
  idHint: "The reference returned by Initialize Transaction.",
  output: [
    { key: "id", type: "number", label: "Transaction id" },
    { key: "status", type: "string", label: "Transaction status" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "amount", type: "number", label: "Amount (smallest unit)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "channel", type: "string", label: "Channel" },
    { key: "gateway_response", type: "string", label: "Gateway response" },
    { key: "paid_at", type: "string", label: "Paid at" },
    { key: "customer", type: "object", label: "Customer" },
    { key: "authorization", type: "object", label: "Authorization (reusable card token)" },
  ],
});
