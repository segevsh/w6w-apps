import { pollFromListAction } from "../../_shared/poll/mod.ts";
import paymentList from "../actions/payment-list.ts";

export default pollFromListAction({
  key: "new-payment",
  title: "New Payment",
  description: "The run gets each newly created Mollie payment.",
  action: paymentList,
  input: () => ({ limit: 100, sort: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Payment ID" }],
  sample: { id: "tr_new", status: "paid", amount: { currency: "EUR", value: "10.00" } },
  maxPages: 1,
});
