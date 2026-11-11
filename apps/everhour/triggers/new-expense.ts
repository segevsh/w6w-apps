import type { TriggerDefinition } from "@w6w/types";
import expenseList from "../actions/expense-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /expenses` (https://developers.everhour.com/api-reference/expenses/get-all-expenses.md)
 * lists the expenses logged by the key's owner in one unpaged response with no order or filter,
 * so the set is diffed as a snapshot (the kit fails past 5000 rows); only additions emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-expense",
  title: "New Expense",
  description: "The run gets each expense newly logged by the API key's owner in Everhour.",
  noun: "expenses",
  output: [
    { key: "id", type: "number", label: "Expense ID" },
    { key: "amount", type: "number", label: "Amount in cents" },
    { key: "date", type: "string", label: "Date" },
    { key: "project", type: "string", label: "Project ID" },
    { key: "category", type: "number", label: "Category ID" },
    { key: "billable", type: "boolean", label: "Billable" },
    { key: "details", type: "string", label: "Details" },
    { key: "user", type: "number", label: "User ID" },
  ],
  sample: {
    id: 234718,
    amount: 2278,
    date: "2026-11-10",
    project: "ev:1234567890",
    category: 236046,
    billable: true,
    details: "Train ticket",
    user: 1304,
  },
  read: (_params, _page, ctx) => expenseList.execute({}, ctx),
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

export default trigger;
