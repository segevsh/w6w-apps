import itemList from "../actions/item-list.ts";
import { companyParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-or-updated-item",
  title: "New or Updated Item",
  description:
    "The run gets each item that is new or whose listed fields changed since the last check.",
  action: itemList,
  params: [companyParam],
  items: (result) => (result as { items?: unknown[] })?.items ?? [],
  idOf: (item) => String((item as { pk?: unknown })?.pk ?? ""),
  updated: true,
  output: [
    { key: "pk", type: "number", label: "Item pk" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { pk: 7, name: "Whale Watching" },
});
