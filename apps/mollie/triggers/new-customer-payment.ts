import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import customerPaymentList from "../actions/customer-payment-list.ts";

export default pollFromListAction({
  key: "new-customer-payment",
  title: "New Customer Payment",
  description: "The run gets each newly created payment for the selected Mollie customer.",
  action: customerPaymentList as unknown as ActionDefinition,
  input: (params) => ({ ...params, limit: 100, sort: "desc" }),
  params: (customerPaymentList.params ?? []).filter((param) => param.key === "customerId"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Payment ID" }],
  sample: { id: "tr_new", status: "paid" },
  maxPages: 1,
});
