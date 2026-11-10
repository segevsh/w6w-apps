import subAccountPageGroupList from "../actions/sub-account-page-group-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger<{ subAccountId: string }>({
  key: "new-page-group",
  title: "New Page Group",
  description: "The run gets each new page group under a sub-account.",
  action: subAccountPageGroupList as unknown as ActionDefinition,
  input: ({ subAccountId }) => ({ subAccountId, sortOrder: "desc", limit: 100 }),
  listKey: "page_groups",
  params: [{ key: "subAccountId", label: "Sub-Account ID", type: "string", required: true }],
  idLabel: "Page Group ID",
});
