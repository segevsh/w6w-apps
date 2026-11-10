import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import subscriptionList from "../actions/subscription-list.ts";

export default pollFromListAction({
  key: "new-subscription",
  title: "New Subscription",
  description: "The run gets each newly created subscription for the selected Mollie customer.",
  action: subscriptionList as unknown as ActionDefinition,
  input: (params) => ({ ...params, limit: 100, sort: "desc" }),
  params: (subscriptionList.params ?? []).filter((param) => param.key === "customerId"),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Subscription ID" }],
  sample: { id: "sub_new", status: "active" },
  maxPages: 1,
});
