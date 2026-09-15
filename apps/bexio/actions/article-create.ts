import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  articleTypeId: number;
  internName: string;
  internCode?: string;
  internDescription?: string;
  purchasePrice?: string;
  salePrice?: string;
  currencyId?: number;
  taxIncomeId?: number;
  taxExpenseId?: number;
  unitId?: number;
  isStock?: boolean;
  remarks?: string;
}

const articleCreate: ActionDefinition<Input> = {
  key: "article-create",
  type: "perform",
  resource: "article",
  title: "Create Article",
  description: "Create an article (item / product).",
  idempotent: false,
  params: [
    {
      key: "articleTypeId",
      label: "Article type",
      type: "select",
      required: true,
      options: [
        { value: 1, label: "Physical product" },
        { value: 2, label: "Service" },
      ],
    },
    { key: "internName", label: "Internal name", type: "string", required: true },
    { key: "internCode", label: "Internal code (SKU)", type: "string" },
    { key: "internDescription", label: "Internal description", type: "text" },
    { key: "purchasePrice", label: "Purchase price", type: "string" },
    { key: "salePrice", label: "Sale price", type: "string" },
    { key: "currencyId", label: "Currency ID", type: "number" },
    {
      key: "taxIncomeId",
      label: "Income tax ID",
      type: "number",
      hint: "References a tax object.",
    },
    { key: "taxExpenseId", label: "Expense tax ID", type: "number" },
    { key: "unitId", label: "Unit ID", type: "number" },
    {
      key: "isStock",
      label: "Track stock",
      type: "boolean",
      default: false,
      hint: "Requires the stock_edit scope to take effect.",
    },
    { key: "remarks", label: "Remarks", type: "text" },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "intern_name", type: "string", label: "Internal name" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).post("/2.0/article", {
      article_type_id: input.articleTypeId,
      intern_name: input.internName,
      intern_code: input.internCode,
      intern_description: input.internDescription,
      purchase_price: input.purchasePrice,
      sale_price: input.salePrice,
      currency_id: input.currencyId,
      tax_income_id: input.taxIncomeId,
      tax_expense_id: input.taxExpenseId,
      unit_id: input.unitId,
      is_stock: input.isStock,
      remarks: input.remarks,
    });
  },
};

export default articleCreate;
