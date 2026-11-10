import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import { accountIdParam, companyIdParam } from "../lib/params.ts";
import userList from "../actions/user-list.ts";

export default pollFromListAction<{ accountId: string; companyId?: string }>({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created user of the account.",
  action: userList as unknown as ActionDefinition,
  params: [accountIdParam, companyIdParam],
  input: (params) => ({ ...params, sort: "created_at", order: "desc", page: 1, perPage: 100 }),
  items: (result) => (result as { users?: unknown[] }).users ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 101, email: "agent@example.com", name: "Sample Agent" },
});
