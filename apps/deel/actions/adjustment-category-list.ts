import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `GET /adjustments/categories` — verified against Deel's own OpenAPI document
 * (`endpoints-3.json`, `get-adjustment-categories`).
 *
 * The lookup `invoice-adjustment-create` needs: Deel identifies bonuses,
 * expenses and deductions by category id, and the ids are per-organization.
 */
const action: ActionDefinition = {
  key: "adjustment-category-list",
  type: "read",
  resource: "invoiceAdjustment",
  title: "List adjustment categories",
  description: "List the bonus, expense and deduction categories this organization has.",
  params: [],
  output: [{ key: "data", type: "array", label: "Categories" }],

  async execute(_input, ctx) {
    ctx.log("info", "listing Deel adjustment categories");
    return await new DeelClient(ctx).request("/adjustments/categories");
  },
};

export default action;
