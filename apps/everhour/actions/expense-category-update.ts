import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `PUT /expenses/categories/{categoryId}` — Update an expense category.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  categoryId: number;
  name: string;
  color?: string;
  unitBased?: boolean;
  unitName?: string;
  unitPrice?: number;
}

const expenseCategoryUpdate: ActionDefinition<Input> = {
  key: "expense-category-update",
  type: "perform",
  resource: "expense-category",
  title: "Update Expense Category",
  description: "Update an expense category.",
  idempotent: true,
  params: [
    {
      key: "categoryId",
      label: "Category ID",
      type: "number",
      required: true,
      hint: "Numeric expense category id (from List Expense Categories).",
    },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "color", label: "Color", type: "string", hint: "Hex colour, e.g. `#92dfb5`." },
    {
      key: "unitBased",
      label: "Unit based",
      type: "boolean",
      hint: "True for per-unit categories such as mileage.",
    },
    { key: "unitName", label: "Unit name", type: "string", hint: "e.g. Miles." },
    { key: "unitPrice", label: "Unit price", type: "number", hint: "Price per unit in cents." },
  ],
  output: [
    { key: "id", type: "number", label: "Category ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/expenses/categories/${encodeId(input.categoryId)}`, {
      method: "PUT",
      body: compact({
        color: input.color,
        name: input.name,
        unitBased: input.unitBased,
        unitName: input.unitName,
        unitPrice: input.unitPrice,
      }),
    });
  },
};

export default expenseCategoryUpdate;
