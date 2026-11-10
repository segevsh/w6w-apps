import { snapshotTrigger } from "../lib/snapshot-trigger.ts";
import inventoryLocationList from "../actions/inventory-location-list.ts";

export default snapshotTrigger({
  key: "new-inventory-location",
  title: "New Inventory Location",
  description: "The run gets each inventory location first seen in the store.",
  action: inventoryLocationList,
  idKey: "id",
  updated: false,
  output: [
    { key: "id", type: "number", label: "Location ID" },
    { key: "code", type: "string", label: "Code" },
    { key: "label", type: "string", label: "Label" },
  ],
  sample: { id: 1, code: "WH-1", label: "Main warehouse" },
});
