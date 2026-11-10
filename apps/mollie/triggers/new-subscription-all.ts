import { pollFromListAction } from "../../_shared/poll/mod.ts";
import subscriptionListAll from "../actions/subscription-list-all.ts";

export default pollFromListAction({
  key: "new-subscription-all",
  title: "New Subscription (Any Customer)",
  description: "The run gets each newly created subscription across the whole Mollie account.",
  action: subscriptionListAll,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Subscription ID" }],
  sample: { id: "sub_new", status: "active" },
  maxPages: 1,
});
