import accountSubAccountList from "../actions/account-sub-account-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger<{ accountId: string }>({
  key: "new-sub-account",
  title: "New Sub-Account",
  description: 'The run gets each new sub-account (Unbounce "Client") under an account.',
  action: accountSubAccountList as unknown as ActionDefinition,
  input: ({ accountId }) => ({ accountId, sortOrder: "desc", limit: 100 }),
  listKey: "sub_accounts",
  params: [{ key: "accountId", label: "Account ID", type: "string", required: true }],
  idLabel: "Sub-Account ID",
});
