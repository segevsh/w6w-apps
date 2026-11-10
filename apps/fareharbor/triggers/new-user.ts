import userList from "../actions/user-list.ts";
import { companyParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user added to the company since the last check.",
  action: userList,
  params: [companyParam],
  items: (result) => (result as { users?: unknown[] })?.users ?? [],
  idOf: (item) => String((item as { pk?: unknown })?.pk ?? ""),
  updated: false,
  output: [
    { key: "pk", type: "number", label: "User pk" },
  ],
  sample: { pk: 1 },
});
