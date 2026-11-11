import itemList from "../actions/item-list.ts";
import { companyParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-item",
  title: "New Item",
  description:
    "The run gets each bookable item (product) created for the company since the last check.",
  action: itemList,
  params: [companyParam],
  items: (result) => (result as { items?: unknown[] })?.items ?? [],
  idOf: (item) => String((item as { pk?: unknown })?.pk ?? ""),
  updated: false,
  output: [
    { key: "pk", type: "number", label: "Item pk" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { pk: 7, name: "Whale Watching" },
});
