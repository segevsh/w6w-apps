import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-expenses.ts";

interface Item {
  id?: string | number;
  contactId?: string | number;
  shipmentId?: string | number;
  sequenceId?: string | number;
}

const newExpense = pollFromListAction({
  key: "new-expense",
  title: "New Expense",
  description: "The run gets each newly created expense.",
  action,
  input: (_params) => ({ limit: 100, offset: 0 }),
  items: (result) => {
    const r = result as { expenses?: unknown[] };
    return r.expenses ?? [];
  },
  idOf: (item) => {
    const value = item as Item;
    return String(value.id ?? value.contactId ?? value.shipmentId ?? value.sequenceId ?? "");
  },
  params: action.params,
  output: [{ key: "id", type: "string", label: "Expense ID" }],
  sample: { id: 1 },
  maxPages: 1,
});

export default newExpense;
