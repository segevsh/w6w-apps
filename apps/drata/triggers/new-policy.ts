import { pollFromListAction } from "../../_shared/poll/mod.ts";
import policyList from "../actions/policy-list.ts";

export default pollFromListAction({
  key: "new-policy",
  title: "New Policy",
  description: "The run gets each new policy.",
  action: policyList,
  input: () => ({ size: 100, sort: "createdAt", sortDir: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Policy ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
