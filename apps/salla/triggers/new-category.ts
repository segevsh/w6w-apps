import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import categoryList from "../actions/category-list.ts";

/**
 * `category-list` documents no sort order and no created-since filter
 * (https://docs.salla.dev/pagination.md and the endpoint page), so each check reads the whole list
 * (a store keeps tens to hundreds of categories) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-category",
  title: "New Category",
  description: "The run gets each category newly added to the store.",
  action: categoryList,
  maxPages: 10,
  minIntervalMs: 300000,
  output: [
    { key: "id", type: "number", label: "Category ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: 701, name: "Example Category", status: "active" },
});
