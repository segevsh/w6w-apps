import { pollFromListAction } from "../../_shared/poll/mod.ts";
import collectionList from "../actions/collection-list.ts";

export default pollFromListAction({
  key: "new-collection",
  title: "New Collection",
  description:
    "The run gets each newly created Mem collection, polled from the existing `collection-list` action with `order_by=created_at`.",
  action: collectionList,
  input: () => ({ page: "", limit: 100, order_by: "created_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "col-1",
    title: "Research",
    note_count: 3,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
