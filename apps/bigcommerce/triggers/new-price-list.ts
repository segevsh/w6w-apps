import { snapshotTrigger } from "../lib/snapshot-trigger.ts";
import priceListList from "../actions/price-list-list.ts";

export default snapshotTrigger({
  key: "new-price-list",
  title: "New Price List",
  description: "The run gets each price list first seen in the store.",
  action: priceListList,
  idKey: "id",
  updated: false,
  output: [
    { key: "id", type: "number", label: "Price list ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "date_modified", type: "string", label: "Modified at" },
  ],
  sample: { id: 3, name: "Wholesale", date_modified: "2026-11-10T10:00:00+00:00" },
});
