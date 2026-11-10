import { pollFromListAction } from "../../_shared/poll/mod.ts";
import paymentLinkList from "../actions/payment-link-list.ts";

export default pollFromListAction({
  key: "new-payment-link",
  title: "New Payment Link",
  description: "The run gets each newly created Mollie payment link.",
  action: paymentLinkList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Payment link ID" }],
  sample: { id: "pl_new", description: "Invoice 1", amount: { currency: "EUR", value: "10.00" } },
  maxPages: 1,
});
