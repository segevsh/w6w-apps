import { sinceTrigger } from "../lib/triggers.ts";
import expenseList from "../actions/expense-list.ts";

export default sinceTrigger({
  key: "new-expense",
  title: "New Expense",
  description: "The run gets each expense newly added in FreeAgent.",
  action: expenseList,
  itemsKey: "expenses",
  input: (_p, w) => w,
  output: [
    { key: "url", type: "string", label: "Expense URL (its ID)" },
    { key: "user", type: "string", label: "User URL" },
    { key: "category", type: "string", label: "Category URL" },
    { key: "dated_on", type: "string", label: "Date" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "gross_value", type: "string", label: "Gross value" },
    { key: "description", type: "string", label: "Description" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/expenses/1",
    user: "https://api.freeagent.com/v2/users/1",
    category: "https://api.freeagent.com/v2/categories/285",
    dated_on: "2026-11-09",
    currency: "GBP",
    gross_value: "-20.0",
    description: "Train ticket",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
});
