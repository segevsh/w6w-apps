import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

/**
 * `GET /api/sites/multiscreen/{site_name}/collection/{collection_name}` — "Get
 * Collection": "Get the fields and data of an existing collection".
 *
 * One collection object, the same shape a `list-collections` entry has —
 * `name`, `item_count`, `fields`, `values`, plus the binding and refresh
 * metadata. The rows come back inside `values`, so this is both the schema read
 * (what fields exist, and what type each one is) and the data read.
 */
const getCollection: ActionDefinition<{ siteName: string; collectionName: string }> = {
  key: "get-collection",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description: "Fetch one collection's fields and rows.",
  params: [
    {
      key: "siteName",
      label: "Site name",
      type: "string",
      required: true,
      hint: "Duda's site alias (`site_name`).",
    },
    {
      key: "collectionName",
      label: "Collection name",
      type: "string",
      required: true,
      hint: "The collection's own `name`, as returned by `list-collections`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Collection name" },
    { key: "item_count", type: "number", label: "Row count" },
    { key: "fields", type: "array", label: "Fields — `{ name, type, multi_select_options }`" },
    { key: "values", type: "array", label: "Rows — `{ id, page_item_url, data }`" },
    { key: "regular_page_bindable", type: "boolean", label: "May be bound to a regular page" },
    { key: "customer_lock", type: "string", label: "Customer lock" },
    { key: "base_refresh_interval", type: "string", label: "Refresh interval (ISO 8601 duration)" },
  ],

  execute(input, ctx) {
    return new DudaClient(ctx).request(
      `/api/sites/multiscreen/${seg(input.siteName)}/collection/${seg(input.collectionName)}`,
    );
  },
};

export default getCollection;
