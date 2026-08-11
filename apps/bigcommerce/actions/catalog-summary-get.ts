import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient } from "../lib/client.ts";

/**
 * `GET /v3/catalog/summary` — a lightweight roll-up of the whole catalog.
 *
 * One cheap call for `inventory_count`, `variant_count`, `inventory_value`, the
 * highest / average / lowest variant price, the oldest and newest variant dates,
 * and the id and name of the category holding the most products. Cheaper than
 * paging the catalog to count it, and the only place several of these numbers
 * exist at all.
 *
 * It is consumption without a ceiling: BigCommerce publishes no API for the plan
 * limit these counts run against, which is why `health/plan-limits.ts` declares
 * that absence rather than pretending this endpoint answers it.
 */
const catalogSummaryGet: ActionDefinition<Record<string, never>> = {
  key: "catalog-summary-get",
  type: "read",
  resource: "catalog",
  title: "Get Catalog Summary",
  description:
    "Inventory count, variant count, inventory value, variant price range and the largest " +
    "category — in one call.",
  params: [],
  output: [
    { key: "inventory_count", type: "number", label: "Inventory count" },
    { key: "variant_count", type: "number", label: "Variant count" },
    { key: "inventory_value", type: "number", label: "Inventory value" },
    { key: "primary_category_name", type: "string", label: "Largest category" },
  ],

  execute(_input, ctx) {
    return new BigCommerceClient(ctx).v3("/catalog/summary");
  },
};

export default catalogSummaryGet;
