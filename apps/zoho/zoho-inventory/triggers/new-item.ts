import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/item-list.ts";

export default pollFromListAction({
  key: "new-item",
  title: "New Item",
  description: "The run gets each newly created Zoho Inventory item, newest first.",
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
    sort_column: "created_time",
    sort_order: "D",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { item_id?: unknown }).item_id ?? ""),
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
    created_time: "2026-11-09",
    last_modified_time: "2026-11-09",
  },
});
