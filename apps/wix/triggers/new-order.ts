import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import searchOrders from "../actions/search-orders.ts";

// Wix eCommerce Search Orders: `createdDate` is sortable ASC/DESC and is the default sort, DESC (https://dev.wix.com/docs/rest/business-solutions/e-commerce/orders/search-orders, verified 2026-11-10). Newest-first, brief 9.1 a.
export default pollFromListAction<Record<string, never>>({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly placed Wix eCommerce order.",
  action: searchOrders as unknown as ActionDefinition,
  input: () => ({ sortFieldName: "createdDate", sortOrder: "DESC", limit: 50 }),
  items: (result) => (result as { orders?: unknown[] }).orders ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "number", type: "string", label: "Order number" },
    { key: "status", type: "string", label: "Status" },
    { key: "paymentStatus", type: "string", label: "Payment status" },
    { key: "createdDate", type: "string", label: "Created at" },
    { key: "updatedDate", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "sample-order-id",
    number: "10001",
    status: "APPROVED",
    paymentStatus: "PAID",
    createdDate: "2026-11-09T10:00:00.000Z",
    updatedDate: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
