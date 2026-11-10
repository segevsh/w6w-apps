import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/payment-list.ts";

export default pollFromListAction({
  key: "new-payment",
  title: "New Payment",
  description: "The run gets each newly created payment.",
  action,
  input: () => ({ start: 0, limit: 30, orderDirection: "DESC", orderField: "id" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Payment ID" }, {
    key: "number",
    type: "string",
    label: "Payment number",
  }],
  sample: { id: "payment-101", number: "sample" },
  maxPages: 1,
});
