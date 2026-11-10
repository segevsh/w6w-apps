import { snapshotTrigger } from "../lib/snapshot-trigger.ts";
import categoryTreeList from "../actions/category-tree-list.ts";

// `GET /v3/catalog/trees` documents only `id:in` and `channel_id:in` (no paging, no dates): the
// collection is one tree per storefront, so it is read whole and diffed.
export default snapshotTrigger({
  key: "new-category-tree",
  title: "New Category Tree",
  description: "The run gets each category tree first seen in the store.",
  action: categoryTreeList,
  idKey: "id",
  updated: false,
  output: [
    { key: "id", type: "number", label: "Tree ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "channels", type: "array", label: "Channel IDs" },
  ],
  sample: { id: 1, name: "Main tree", channels: [1] },
});
