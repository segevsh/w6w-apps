import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import accountList from "../actions/account-list.ts";

/** Newest-first via the documented `order=desc` query parameter (https://docs.mercury.com/reference/listtransactions). */
export default pollFromListAction({
  key: "new-account",
  title: "New Account",
  description: "The run gets each newly opened account: id, name, status and type.",
  action: accountList as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type" },
  ],
  sample: { id: "account-1", name: "Operations", status: "active", type: "mercury" },
  maxPages: 1,
});
