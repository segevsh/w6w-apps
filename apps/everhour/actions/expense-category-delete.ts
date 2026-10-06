import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /expenses/categories/{categoryId}` — Delete an expense category, moving or deleting its expenses.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  categoryId: number;
  targetCategory?: number;
  removeExpenses?: boolean;
}

const expenseCategoryDelete: ActionDefinition<Input> = {
  key: "expense-category-delete",
  type: "perform",
  resource: "expense-category",
  title: "Delete Expense Category",
  description: "Delete an expense category, moving or deleting its expenses.",
  idempotent: true,
  params: [
    {
      key: "categoryId",
      label: "Category ID",
      type: "number",
      required: true,
      hint: "Numeric expense category id (from List Expense Categories).",
    },
    {
      key: "targetCategory",
      label: "Move expenses to",
      type: "number",
      hint: "Category id that receives the deleted category's expenses.",
    },
    {
      key: "removeExpenses",
      label: "Delete its expenses",
      type: "boolean",
      hint: "Delete the expenses instead of moving them.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/expenses/categories/${encodeId(input.categoryId)}`, {
      method: "DELETE",
      body: compact({ targetCategory: input.targetCategory, removeExpenses: input.removeExpenses }),
    });
  },
};

export default expenseCategoryDelete;
