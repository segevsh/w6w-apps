import { pollFromListAction } from "../../_shared/poll/mod.ts";
import bankAccountList from "../actions/bank-account-list.ts";

// Lob documents this list as "sorted by creation date, with the most recently created appearing
// first" (https://docs.lob.com/); the sort is also sent explicitly where the action takes one.
export default pollFromListAction({
  key: "new-bank-account",
  title: "New Bank Account",
  description: "The run gets each newly added bank account (the account number is never included).",
  action: bankAccountList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Bank account ID" },
    { key: "date_created", type: "string", label: "Created at" },
  ],
  sample: { id: "bank_123", date_created: "2026-11-10T09:00:00.000Z" },
  maxPages: 1,
});
