import subAccountDomainList from "../actions/sub-account-domain-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger<{ subAccountId: string }>({
  key: "new-domain",
  title: "New Domain",
  description: "The run gets each new custom domain registered under a sub-account.",
  action: subAccountDomainList as unknown as ActionDefinition,
  input: ({ subAccountId }) => ({ subAccountId, sortOrder: "desc", limit: 100 }),
  listKey: "domains",
  params: [{ key: "subAccountId", label: "Sub-Account ID", type: "string", required: true }],
  idLabel: "Domain ID",
});
