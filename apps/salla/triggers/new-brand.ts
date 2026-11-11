import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import brandList from "../actions/brand-list.ts";

/**
 * `brand-list` documents no sort order and no created-since filter
 * (https://docs.salla.dev/pagination.md and the endpoint page), so each check reads the whole list
 * (a store keeps tens of brands) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-brand",
  title: "New Brand",
  description: "The run gets each brand newly added to the store.",
  action: brandList,
  maxPages: 10,
  minIntervalMs: 300000,
  output: [
    { key: "id", type: "number", label: "Brand ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 801, name: "Example Brand" },
});
