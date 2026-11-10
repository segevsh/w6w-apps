import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import queryDataItems from "../actions/query-data-items.ts";

// Wix Data: `_updatedDate` is a read-only system field (https://dev.wix.com/docs/api-reference/business-solutions/cms/data-items/data-item-object, verified 2026-11-10) and Query Data Items sorts on any field. Dates arrive as `{ $date }`; the id carries the update stamp, so an edit is a new event (brief 9.2).
export default pollFromListAction<{ dataCollectionId: string }>({
  key: "new-or-updated-data-item",
  title: "New or Updated Data Item",
  description: "The run gets each item added to or edited in the chosen CMS collection.",
  action: queryDataItems as unknown as ActionDefinition,
  input: ({ dataCollectionId }) => ({
    dataCollectionId,
    sortFieldName: "_updatedDate",
    sortOrder: "DESC",
    limit: 50,
    offset: 0,
  }),
  items: (result) => (result as { dataItems?: unknown[] }).dataItems ?? [],
  idOf: (item) => {
    const d = item as { id?: unknown; data?: { _updatedDate?: { $date?: unknown } } };
    return `${d.id ?? ""}:${d.data?._updatedDate?.$date ?? ""}`;
  },
  params: [{ key: "dataCollectionId", label: "Collection ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "dataCollectionId", type: "string", label: "Collection ID" },
    { key: "data", type: "object", label: "Item fields" },
  ],
  sample: {
    id: "sample-item-id",
    dataCollectionId: "Cities",
    data: {
      _id: "sample-item-id",
      title: "Haifa",
      _updatedDate: { $date: "2026-11-10T10:00:00.000Z" },
    },
  },
  maxPages: 1,
});
