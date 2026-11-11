import { pollFromListAction } from "../../_shared/poll/mod.ts";
import refundList from "../actions/refund-list.ts";

export default pollFromListAction({
  key: "new-refund",
  title: "New Refund",
  description: "The run gets each newly created Mollie refund.",
  action: refundList,
  input: () => ({ limit: 100, sort: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Refund ID" }],
  sample: { id: "re_new", amount: { currency: "EUR", value: "10.00" } },
  maxPages: 1,
});
