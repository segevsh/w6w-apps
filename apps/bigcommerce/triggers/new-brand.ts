import { snapshotTrigger } from "../lib/snapshot-trigger.ts";
import brandList from "../actions/brand-list.ts";

export default snapshotTrigger({
  key: "new-brand",
  title: "New Brand",
  description: "The run gets each catalog brand first seen in the store.",
  action: brandList,
  idKey: "id",
  updated: false,
  output: [
    { key: "id", type: "number", label: "Brand ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 7, name: "Acme" },
});
