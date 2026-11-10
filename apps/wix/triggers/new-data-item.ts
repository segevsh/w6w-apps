import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import queryDataItems from "../actions/query-data-items.ts";

// Wix Data: every item carries the read-only system fields `_createdDate` and `_updatedDate` (https://dev.wix.com/docs/api-reference/business-solutions/cms/data-items/data-item-object, verified 2026-11-10); Query Data Items takes a sort on any field (https://dev.wix.com/docs/api-reference/business-solutions/cms/data-items/query-data-items). Newest-first, brief 9.1 a; the collection is the user's pick.
export default pollFromListAction<{ dataCollectionId: string }>({
  key: "new-data-item",
  title: "New Data Item",
  description: "The run gets each item newly added to the chosen CMS collection.",
  action: queryDataItems as unknown as ActionDefinition,
  input: ({ dataCollectionId }) => ({
    dataCollectionId,
    sortFieldName: "_createdDate",
    sortOrder: "DESC",
    limit: 50,
    offset: 0,
  }),
  items: (result) => (result as { dataItems?: unknown[] }).dataItems ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "dataCollectionId", label: "Collection ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "dataCollectionId", type: "string", label: "Collection ID" },
    { key: "data", type: "object", label: "Item fields" },
  ],
  sample: {
    id: "sample-item-id",
    dataCollectionId: "Cities",
    data: { _id: "sample-item-id", title: "Haifa" },
  },
  maxPages: 1,
});
