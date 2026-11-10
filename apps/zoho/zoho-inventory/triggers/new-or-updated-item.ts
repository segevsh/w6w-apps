import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/item-list.ts";

export default pollFromListAction({
  key: "new-or-updated-item",
  title: "New or Updated Item",
  description: "The run gets each Zoho Inventory item when it is created or edited, newest first.",
  action,
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      hint:
        "Zoho Inventory organization id. Leave empty to use the one recorded when the connection was authorized.",
    },
  ],
  input: (params: { organizationId?: string }) => ({
    organizationId: params.organizationId,
    per_page: 100,
    sort_column: "last_modified_time",
    sort_order: "D",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const i = item as { item_id?: unknown; last_modified_time?: unknown };
    return `${String(i.item_id ?? "")}:${String(i.last_modified_time ?? "")}`;
  },
  output: [
    { key: "item_id", type: "string", label: "Item ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sku", type: "string", label: "SKU" },
    { key: "status", type: "string", label: "Status" },
    { key: "rate", type: "number", label: "Selling rate" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_modified_time", type: "string", label: "Last modified time" },
  ],
  sample: {
    item_id: "4815000000044208",
    name: "Bags-small",
    sku: "SK123",
    status: "active",
    rate: 6,
    created_time: "2026-11-01",
    last_modified_time: "2026-11-09",
  },
});
