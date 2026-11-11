import accountList from "../actions/account-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger<Record<string, never>>({
  key: "new-account",
  title: "New Account",
  description: "The run gets each new account the connection owns.",
  action: accountList as unknown as ActionDefinition,
  input: () => ({ sortOrder: "desc" }),
  listKey: "accounts",
  params: [],
  idLabel: "Account ID",
});
