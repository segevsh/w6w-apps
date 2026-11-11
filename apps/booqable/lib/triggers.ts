import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";
import orderList from "../actions/order-list.ts";
import planningList from "../actions/planning-list.ts";
import productGroupList from "../actions/product-group-list.ts";
import productList from "../actions/product-list.ts";
import stockItemList from "../actions/stock-item-list.ts";

/**
 * Booqable list endpoints are JSON:API collections and document `sort=attribute1,-attribute2`
 * plus `created_at` / `updated_at` attributes on every resource listed here
 * (https://developers.booqable.com/ — "List <resource>"), so the first page sorted by
 * `-created_at` is the newest records and the first page sorted by `-updated_at` is the most
 * recently touched.
 */
function make(spec: {
  action: ActionDefinition;
  noun: string;
  title: string;
  mode: "new" | "updated";
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const updated = spec.mode === "updated";
  return pollFromListAction({
    key: `${updated ? "new-or-updated" : "new"}-${spec.noun}`,
    title: `${updated ? "New or Updated" : "New"} ${spec.title}`,
    description: updated
      ? `The run gets each Booqable ${spec.title.toLowerCase()} that is created or edited.`
      : `The run gets each newly created Booqable ${spec.title.toLowerCase()}.`,
    action: spec.action,
    input: () => ({
      sort: updated ? "-updated_at" : "-created_at",
      pageNumber: 1,
      pageSize: 100,
    }),
    items: (result) => (result as { data?: unknown[] }).data ?? [],
    idOf: (item) => {
      const r = item as { id?: string; attributes?: { updated_at?: string } };
      return updated ? `${r.id}:${r.attributes?.updated_at ?? ""}` : String(r.id);
    },
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

const STAMPS: OutputField[] = [
  { key: "attributes", type: "object", label: "Attributes (incl. created_at, updated_at)" },
];
const out = (label: string): OutputField[] => [
  { key: "id", type: "string", label: `${label} ID` },
  { key: "type", type: "string", label: "Resource type" },
  ...STAMPS,
];
const sample = (type: string, name: string) => ({
  id: "0f79b63e-2b9a-4178-81f6-3b28593c5419",
  type,
  attributes: {
    name,
    created_at: "2026-11-09T09:00:00.000000+00:00",
    updated_at: "2026-11-09T11:00:00.000000+00:00",
  },
});

const ORDER = { noun: "order", title: "Order", action: orderList as unknown as ActionDefinition };
const PRODUCT = {
  noun: "product",
  title: "Product",
  action: productList as unknown as ActionDefinition,
};
const GROUP = {
  noun: "product-group",
  title: "Product Group",
  action: productGroupList as unknown as ActionDefinition,
};
const STOCK = {
  noun: "stock-item",
  title: "Stock Item",
  action: stockItemList as unknown as ActionDefinition,
};
const CUSTOMER = {
  noun: "customer",
  title: "Customer",
  action: customerList as unknown as ActionDefinition,
};
const PLANNING = {
  noun: "planning",
  title: "Planning",
  action: planningList as unknown as ActionDefinition,
};

export const newOrder = make({
  ...ORDER,
  mode: "new",
  output: out("Order"),
  sample: sample("orders", "Order #1"),
});
export const updatedOrder = make({
  ...ORDER,
  mode: "updated",
  output: out("Order"),
  sample: sample("orders", "Order #1"),
});
export const newProduct = make({
  ...PRODUCT,
  mode: "new",
  output: out("Product"),
  sample: sample("products", "Tripod"),
});
export const updatedProduct = make({
  ...PRODUCT,
  mode: "updated",
  output: out("Product"),
  sample: sample("products", "Tripod"),
});
export const newProductGroup = make({
  ...GROUP,
  mode: "new",
  output: out("Product group"),
  sample: sample("product_groups", "iPad Pro"),
});
export const updatedProductGroup = make({
  ...GROUP,
  mode: "updated",
  output: out("Product group"),
  sample: sample("product_groups", "iPad Pro"),
});
export const newStockItem = make({
  ...STOCK,
  mode: "new",
  output: out("Stock item"),
  sample: sample("stock_items", "Tripod #3"),
});
export const updatedStockItem = make({
  ...STOCK,
  mode: "updated",
  output: out("Stock item"),
  sample: sample("stock_items", "Tripod #3"),
});
export const updatedCustomer = make({
  ...CUSTOMER,
  mode: "updated",
  output: out("Customer"),
  sample: sample("customers", "Ada Lovelace"),
});
export const newPlanning = make({
  ...PLANNING,
  mode: "new",
  output: out("Planning"),
  sample: sample("plannings", "Reservation"),
});
