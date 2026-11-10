import { snapshotTrigger } from "../lib/snapshot-trigger.ts";
import priceListList from "../actions/price-list-list.ts";

export default snapshotTrigger({
  key: "new-or-updated-price-list",
  title: "New or Updated Price List",
  description: "The run gets each price list when it is first seen or its details change.",
  action: priceListList,
  idKey: "id",
  updated: true,
  output: [
    { key: "id", type: "number", label: "Price list ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "date_modified", type: "string", label: "Modified at" },
  ],
  sample: { id: 3, name: "Wholesale", date_modified: "2026-11-10T10:00:00+00:00" },
});
