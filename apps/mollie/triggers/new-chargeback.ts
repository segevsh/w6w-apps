import { pollFromListAction } from "../../_shared/poll/mod.ts";
import chargebackList from "../actions/chargeback-list.ts";

export default pollFromListAction({
  key: "new-chargeback",
  title: "New Chargeback",
  description: "The run gets each newly created Mollie chargeback.",
  action: chargebackList,
  input: () => ({ limit: 100, sort: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Chargeback ID" }],
  sample: { id: "chb_new", amount: { currency: "EUR", value: "10.00" } },
  maxPages: 1,
});
