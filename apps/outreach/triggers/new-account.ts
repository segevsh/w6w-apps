import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/account-list.ts";

export default pollFromListAction({
  key: "new-account",
  title: "New Account",
  description: "The run gets each newly created account.",
  action,
  input: () => ({ sort: "-createdAt", pageSize: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Account ID" }],
  sample: { id: "account-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
