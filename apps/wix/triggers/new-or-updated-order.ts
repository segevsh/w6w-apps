import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import searchOrders from "../actions/search-orders.ts";

// Wix eCommerce Search Orders: `updatedDate` is sortable ASC/DESC (https://dev.wix.com/docs/rest/business-solutions/e-commerce/orders/search-orders, verified 2026-11-10). The id carries the update stamp, so a change is a new event (brief 9.2).
export default pollFromListAction<Record<string, never>>({
  key: "new-or-updated-order",
  title: "New or Updated Order",
  description: "The run gets each Wix eCommerce order that is placed or changes.",
  action: searchOrders as unknown as ActionDefinition,
  input: () => ({ sortFieldName: "updatedDate", sortOrder: "DESC", limit: 50 }),
  items: (result) => (result as { orders?: unknown[] }).orders ?? [],
  idOf: (item) => {
    const o = item as { id?: unknown; updatedDate?: unknown };
    return `${o.id ?? ""}:${o.updatedDate ?? ""}`;
  },
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
    updatedDate: "2026-11-10T10:00:00.000Z",
  },
  maxPages: 1,
});
